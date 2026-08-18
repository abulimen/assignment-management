import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getHarness, apiCall, registerUser } from './helpers/harness.js';

let h;
let lecturerA;
let lecturerB;
let student1;
let student2;

beforeAll(async () => {
  h = await getHarness();
  lecturerA = await registerUser(h.api, { name: 'Lecturer A', role: 'lecturer' });
  lecturerB = await registerUser(h.api, { name: 'Lecturer B', role: 'lecturer' });
  student1 = await registerUser(h.api, { name: 'Student 1', role: 'student' });
  student2 = await registerUser(h.api, { name: 'Student 2', role: 'student' });
});

afterAll(async () => { await h.close(); });

describe('Course & Assignment Scoping', () => {
  let courseSWE;
  let courseCOS;

  it('lecturer can create courses with unique invite codes', async () => {
    const res = await apiCall(h.api, 'courses', {
      method: 'POST',
      token: lecturerA.token,
      body: {
        code: 'SWE 201',
        title: 'Software Engineering II',
        semester: 'Harmattan 2026',
        description: 'Advanced software design principles',
      },
    });

    expect(res.status).toBe(201);
    expect(res.json.course.id).toBeTruthy();
    expect(res.json.course.code).toBe('SWE 201');
    expect(res.json.course.invite_code).toMatch(/^SWE201-[A-Z0-9]+$/);
    courseSWE = res.json.course;

    // Create a second course
    const res2 = await apiCall(h.api, 'courses', {
      method: 'POST',
      token: lecturerA.token,
      body: {
        code: 'COS 301',
        title: 'Database Systems',
      },
    });
    expect(res2.status).toBe(201);
    courseCOS = res2.json.course;
  });

  it('lecturer sees only their taught courses in GET /api/courses', async () => {
    const resA = await apiCall(h.api, 'courses', { token: lecturerA.token });
    expect(resA.status).toBe(200);
    expect(resA.json.courses.length).toBeGreaterThanOrEqual(2);

    const resB = await apiCall(h.api, 'courses', { token: lecturerB.token });
    expect(resB.status).toBe(200);
    // Lecturer B does not teach courseSWE yet
    expect(resB.json.courses.some((c) => c.id === courseSWE.id)).toBe(false);
  });

  it('student cannot create a course (403)', async () => {
    const res = await apiCall(h.api, 'courses', {
      method: 'POST',
      token: student1.token,
      body: { code: 'HACK 101', title: 'Illegal' },
    });
    expect(res.status).toBe(403);
  });

  it('student can join course using invite code', async () => {
    const res = await apiCall(h.api, 'courses/join', {
      method: 'POST',
      token: student1.token,
      body: { invite_code: courseSWE.invite_code },
    });
    expect(res.status).toBe(200);
    expect(res.json.joined).toBe(true);

    // Re-joining returns already_member: true
    const resRejoin = await apiCall(h.api, 'courses/join', {
      method: 'POST',
      token: student1.token,
      body: { invite_code: courseSWE.invite_code },
    });
    expect(resRejoin.status).toBe(200);
    expect(resRejoin.json.already_member).toBe(true);
  });

  it('student sees only enrolled courses in GET /api/courses', async () => {
    const res1 = await apiCall(h.api, 'courses', { token: student1.token });
    expect(res1.status).toBe(200);
    expect(res1.json.courses.some((c) => c.id === courseSWE.id)).toBe(true);
    expect(res1.json.courses.some((c) => c.id === courseCOS.id)).toBe(false);

    const res2 = await apiCall(h.api, 'courses', { token: student2.token });
    expect(res2.status).toBe(200);
    expect(res2.json.courses.some((c) => c.id === courseSWE.id)).toBe(false);
  });

  it('lecturer can add co-lecturer to course', async () => {
    const addRes = await apiCall(h.api, `courses/${courseSWE.id}/members`, {
      method: 'POST',
      token: lecturerA.token,
      body: { email: lecturerB.user.email, role: 'lecturer' },
    });
    expect(addRes.status).toBe(200);

    // Now Lecturer B can view and manage courseSWE
    const resB = await apiCall(h.api, `courses/${courseSWE.id}`, { token: lecturerB.token });
    expect(resB.status).toBe(200);
    expect(resB.json.course.id).toBe(courseSWE.id);
  });

  it('assignment creation scopes to course and isolates unenrolled students', async () => {
    const assignRes = await apiCall(h.api, 'assignments', {
      method: 'POST',
      token: lecturerA.token,
      body: {
        course_id: courseSWE.id,
        title: 'SWE 201 Project 1',
        description: 'Build a modular architecture',
      },
    });
    expect(assignRes.status).toBe(201);
    const assignId = assignRes.json.assignment.id;

    // Student 1 (enrolled) can see the assignment
    const res1 = await apiCall(h.api, 'assignments', { token: student1.token });
    expect(res1.status).toBe(200);
    expect(res1.json.assignments.some((a) => a.id === assignId)).toBe(true);

    // Student 2 (not enrolled) cannot see the assignment
    const res2 = await apiCall(h.api, 'assignments', { token: student2.token });
    expect(res2.status).toBe(200);
    expect(res2.json.assignments.some((a) => a.id === assignId)).toBe(false);

    // Student 2 cannot access assignment detail directly (403)
    const directRes = await apiCall(h.api, `assignments/${assignId}`, { token: student2.token });
    expect(directRes.status).toBe(403);
  });

  it('targeted assignment (target_type = selected) only shows to selected students', async () => {
    // Enroll student 2 into courseSWE
    await apiCall(h.api, 'courses/join', {
      method: 'POST',
      token: student2.token,
      body: { invite_code: courseSWE.invite_code },
    });

    // Create targeted assignment only for Student 1
    const targetedRes = await apiCall(h.api, 'assignments', {
      method: 'POST',
      token: lecturerA.token,
      body: {
        course_id: courseSWE.id,
        title: 'Special Honors Research',
        target_type: 'selected',
        student_ids: [student1.user.id],
      },
    });
    expect(targetedRes.status).toBe(201);
    const targetedId = targetedRes.json.assignment.id;

    // Student 1 can view
    const s1View = await apiCall(h.api, `assignments/${targetedId}`, { token: student1.token });
    expect(s1View.status).toBe(200);

    // Student 2 is enrolled in course, but not a participant in this assignment (403)
    const s2View = await apiCall(h.api, `assignments/${targetedId}`, { token: student2.token });
    expect(s2View.status).toBe(403);
  });

  it('supports duplicating assignment to another course (Assign to another course)', async () => {
    // Create assignment in courseSWE
    const srcRes = await apiCall(h.api, 'assignments', {
      method: 'POST',
      token: lecturerA.token,
      body: {
        course_id: courseSWE.id,
        title: 'Midterm Essay',
        description: 'Explain concurrency models',
      },
    });
    const srcId = srcRes.json.assignment.id;

    // Duplicate to courseCOS
    const dupRes = await apiCall(h.api, `assignments/${srcId}/duplicate`, {
      method: 'POST',
      token: lecturerA.token,
      body: {
        target_course_id: courseCOS.id,
      },
    });
    expect(dupRes.status).toBe(201);
    expect(dupRes.json.assignment.course_id).toBe(courseCOS.id);
    expect(dupRes.json.assignment.title).toBe('Midterm Essay');
    expect(dupRes.json.assignment.id).not.toBe(srcId);
  });

  it('lecturer can delete course with password confirmation', async () => {
    // Attempt without password -> 422
    const failNoPass = await apiCall(h.api, `courses/${courseCOS.id}`, {
      method: 'DELETE',
      token: lecturerA.token,
      body: {},
    });
    expect(failNoPass.status).toBe(422);

    // Attempt with wrong password -> 401
    const failWrongPass = await apiCall(h.api, `courses/${courseCOS.id}`, {
      method: 'DELETE',
      token: lecturerA.token,
      body: { password: 'WrongPassword!' },
    });
    expect(failWrongPass.status).toBe(401);

    // Successful deletion with valid password
    const delRes = await apiCall(h.api, `courses/${courseCOS.id}`, {
      method: 'DELETE',
      token: lecturerA.token,
      body: { password: 'password123' },
    });
    expect(delRes.status).toBe(200);
    expect(delRes.json.message).toBe('Course deleted successfully');
  });
});
