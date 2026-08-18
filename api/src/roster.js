// Group roster queries shared by GET /api/assignments/:id (lecturer owner)
// and GET /api/assignments/:id/groups. Members are joined from group_members
// + users + group_member_status (status COALESCE'd to 'not_started').

export async function groupMembers(pool, groupId) {
  const [members] = await pool.query(`
    SELECT gm.student_id, u.name AS student_name, u.email, u.student_id AS student_matric, gm.joined_at,
           (g.leader_id = gm.student_id) AS is_leader,
           COALESCE(gms.status, 'not_started') AS status
    FROM group_members gm
    JOIN \`groups\` g ON g.id = gm.group_id
    JOIN users u ON u.id = gm.student_id
    LEFT JOIN group_member_status gms
      ON gms.group_id = gm.group_id AND gms.student_id = gm.student_id
    WHERE gm.group_id = ?
    ORDER BY gm.joined_at ASC
  `, [groupId]);
  return members;
}

export async function rosterForAssignment(pool, assignmentId) {
  const [groups] = await pool.query(`
    SELECT g.*, u.name AS leader_name, COUNT(gm.id) AS member_count
    FROM \`groups\` g
    JOIN users u ON u.id = g.leader_id
    LEFT JOIN group_members gm ON gm.group_id = g.id
    WHERE g.assignment_id = ?
    GROUP BY g.id
  `, [assignmentId]);
  for (const g of groups) {
    g.members = await groupMembers(pool, g.id);
  }
  return groups;
}