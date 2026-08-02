import math
from statistics import stdev, mean

# Weighted originality scoring engine with:
# - Effective paste ratio (credit for editing pasted content)
# - Transcription pattern detection (retyping from external source)
# - Relevance scaling for non-paste factors

def compute_verdict(events, stats):
    factors = {}
    risk_flags = []

    # Extract raw stats
    keystroke_count = int(stats.get("keystroke_count", 0))
    paste_count = int(stats.get("paste_count", 0))
    delete_count = int(stats.get("delete_count", 0))
    cursor_jumps = int(stats.get("cursor_jumps", 0))
    avg_wpm = float(stats.get("avg_wpm", 0))
    paste_ratio = float(stats.get("paste_ratio", 0))
    total_time_ms = int(stats.get("total_time_ms", 0))
    total_events = len(events)

    if total_events == 0:
        return {
            "overall_score": 0, "verdict": "No Data", "confidence": "none",
            "factors": {}, "risk_flags": []
        }

    total_minutes = max(total_time_ms / 60000, 0.016)

    # --- Classify events and track paste ranges for effective paste ratio ---
    keystroke_events = []  # with timestamps for cadence/transcription analysis
    typed_chars = 0
    pasted_chars = 0
    deleted_chars = 0
    format_count = 0
    paste_ranges = []  # {from, to, original_len, unmodified_len}

    for e in events:
        etype = e.get("type", "")
        steps = e.get("steps")

        if steps:
            for step in steps:
                step_type = step.get("stepType", "")
                if step_type == "replace":
                    frm = step.get("from", 0)
                    to = step.get("to", 0)
                    deleted = to - frm
                    inserted_len = _count_slice_text(step.get("slice", {}).get("content", []))

                    if inserted_len > 0 and deleted == 0:
                        if inserted_len == 1:
                            keystroke_events.append(e)
                            typed_chars += 1
                        else:
                            pasted_chars += inserted_len
                            paste_ranges.append({
                                "from": frm, "to": frm + inserted_len,
                                "original_len": inserted_len,
                                "unmodified_len": inserted_len
                            })
                    elif deleted > 0 and inserted_len == 0:
                        deleted_chars += deleted
                        # Check if this delete overlaps any paste range
                        for pr in paste_ranges:
                            if pr["unmodified_len"] > 0:
                                overlap = min(to, pr["to"]) - max(frm, pr["from"])
                                if overlap > 0:
                                    pr["unmodified_len"] = max(0, pr["unmodified_len"] - overlap)
                    elif deleted > 0 and inserted_len > 0:
                        deleted_chars += deleted
                        # Check overlap for the delete portion
                        for pr in paste_ranges:
                            if pr["unmodified_len"] > 0:
                                overlap = min(to, pr["to"]) - max(frm, pr["from"])
                                if overlap > 0:
                                    pr["unmodified_len"] = max(0, pr["unmodified_len"] - overlap)
                        if inserted_len == 1:
                            keystroke_events.append(e)
                            typed_chars += 1
                        else:
                            pasted_chars += inserted_len
                elif step_type in ("addMark", "removeMark"):
                    format_count += 1
        else:
            # Legacy event classification
            if etype == "keystroke":
                keystroke_events.append(e)
                typed_chars += 1
            elif etype == "paste":
                text = e.get("data", {}).get("text", "")
                pasted_chars += len(text)
                paste_ranges.append({
                    "from": e.get("data", {}).get("position", 0),
                    "to": e.get("data", {}).get("position", 0) + len(text),
                    "original_len": len(text),
                    "unmodified_len": len(text)
                })
            elif etype == "delete":
                deleted_chars += e.get("data", {}).get("length", 0)

    # --- Compute effective paste ratio ---
    unmodified_pasted_chars = sum(pr["unmodified_len"] for pr in paste_ranges)
    total_chars = typed_chars + pasted_chars
    effective_paste_ratio = (unmodified_pasted_chars / total_chars) if total_chars > 0 else 0

    # --- Factor 1: Paste Ratio (20%) — uses effective ratio ---
    paste_score = max(0, 100 - effective_paste_ratio * 500)
    if paste_ratio > 0 and effective_paste_ratio < paste_ratio:
        detail = f"{paste_ratio * 100:.1f}% pasted ({effective_paste_ratio * 100:.1f}% unmodified after editing)"
    else:
        detail = f"{paste_ratio * 100:.1f}% of text was pasted"
    factors["paste_ratio"] = {
        "score": round(paste_score), "weight": 20,
        "label": "Paste Ratio", "detail": detail
    }
    if paste_ratio > 0.5 and effective_paste_ratio > 0.5:
        risk_flags.append({"level": "critical", "message": "High Risk: Excessive Copy-Paste (unmodified)"})
    elif paste_ratio > 0.5 and effective_paste_ratio < 0.3:
        risk_flags.append({"level": "warning", "message": f"Pasted content was heavily edited ({(1-effective_paste_ratio/paste_ratio)*100:.0f}% modified) — partial credit applied"})

    # --- Factor 2: Typing Cadence (20%) ---
    intervals = []
    if len(keystroke_events) >= 10:
        for i in range(1, len(keystroke_events)):
            gap = keystroke_events[i]["occurred_at"] - keystroke_events[i-1]["occurred_at"]
            if 0 < gap < 10:
                intervals.append(gap)
    if len(intervals) >= 10:
        avg_interval = mean(intervals)
        interval_std = stdev(intervals) if len(intervals) > 1 else 0
        cv = interval_std / avg_interval if avg_interval > 0 else 0
        cadence_score = min(100, max(0, cv * 200))
        if cv < 0.15:
            risk_flags.append({"level": "critical", "message": "High Risk: Unnaturally Consistent Typing (possible transcription bot)"})
        elif cv < 0.25:
            risk_flags.append({"level": "warning", "message": "Risk: Typing cadence is unusually consistent"})
        detail = f"CV: {cv:.2f} ({'natural' if cv > 0.3 else 'unusually consistent'} variation)"
    else:
        cadence_score = 50
        detail = f"Insufficient keystroke data ({len(keystroke_events)} keystrokes found)"
    factors["typing_cadence"] = {
        "score": round(cadence_score), "weight": 20,
        "label": "Typing Cadence", "detail": detail
    }

    # --- Factor 3: Edit Density (15%) ---
    total_text_ops = max(typed_chars + deleted_chars, 1)
    delete_ratio = deleted_chars / total_text_ops
    if delete_ratio < 0.02:
        edit_score = 10
        risk_flags.append({"level": "warning", "message": "Very low edit density — possible transcription of external screen"})
    elif delete_ratio < 0.05:
        edit_score = 70
    elif delete_ratio < 0.30:
        edit_score = 100
    else:
        edit_score = 60
    factors["edit_density"] = {
        "score": round(edit_score), "weight": 15,
        "label": "Edit Density",
        "detail": f"{deleted_chars} chars deleted vs {typed_chars} typed ({delete_ratio * 100:.1f}% correction rate)"
    }

    # --- Factor 4: Sustained Speed (10%) ---
    speed_score = 100
    if avg_wpm > 55 and total_minutes > 15 and delete_ratio < 0.02:
        speed_score = 20
        risk_flags.append({"level": "critical", "message": "High Risk: Transcription of External Screen Detected (WPM > 55, no corrections, > 15 min)"})
    elif avg_wpm > 55 and total_minutes > 15:
        speed_score = 50
        risk_flags.append({"level": "warning", "message": f"Warning: Sustained {avg_wpm:.0f} WPM for {total_minutes:.0f} minutes"})
    elif avg_wpm > 55:
        speed_score = 80
    factors["sustained_speed"] = {
        "score": round(speed_score), "weight": 10,
        "label": "Sustained Speed",
        "detail": f"Avg {avg_wpm:.0f} WPM over {total_minutes:.0f} minutes"
    }

    # --- Factor 5: Cursor Jumps (10%) ---
    jumps_per_min = cursor_jumps / total_minutes
    if jumps_per_min > 3:
        jump_score = 30
    elif jumps_per_min > 1:
        jump_score = 70
    else:
        jump_score = 100
    factors["cursor_jumps"] = {
        "score": round(jump_score), "weight": 10,
        "label": "Cursor Jumps",
        "detail": f"{jumps_per_min:.1f} jumps per minute"
    }

    # --- Factor 6: Growth Pattern (10%) ---
    snapshots = [e for e in events if e.get("type") == "snapshot"]
    growth_score = 100
    detail = "Document grew steadily over time"
    if len(snapshots) >= 3:
        sizes = []
        for s in snapshots:
            doc = s.get("data", {}).get("doc", {})
            size = _estimate_doc_size(doc)
            sizes.append({"time": s["occurred_at"], "size": size})
        if len(sizes) >= 2:
            bursts = 0
            for i in range(1, len(sizes)):
                growth = sizes[i]["size"] - sizes[i-1]["size"]
                if growth > 500:
                    bursts += 1
            burst_ratio = bursts / (len(sizes) - 1)
            growth_score = round(100 * (1 - burst_ratio))
            if burst_ratio > 0.5:
                detail = f"Bursty growth pattern: {bursts}/{len(sizes)-1} intervals had large jumps"
                risk_flags.append({"level": "warning", "message": "Bursty document growth — large pastes detected between snapshots"})
    factors["snapshot_growth"] = {
        "score": round(growth_score), "weight": 10,
        "label": "Growth Pattern", "detail": detail
    }

    # --- Factor 7: Transcription Pattern (15%) — NEW ---
    # Detects "retyping from an external source" (no paste events, but
    # the typing pattern suggests linear transcription, not original composition).
    transcription_score = 100
    trans_detail = "Natural typing pattern with pauses and corrections"

    # Find sustained typing runs (consecutive keystrokes without pauses > 3s)
    runs = _find_sustained_runs(keystroke_events, max_gap=3.0)
    long_runs = [r for r in runs if r["duration"] > 30 and r["wpm"] > 30]
    very_long_runs = [r for r in runs if r["duration"] > 60 and r["wpm"] > 40]

    if len(very_long_runs) > 3 and delete_ratio < 0.05 and format_count < 2:
        transcription_score = 20
        risk_flags.append({
            "level": "critical",
            "message": f"High Risk: Sustained linear typing pattern — possible transcription from external source ({len(very_long_runs)} runs at 40+ WPM, {format_count} formatting changes)"
        })
        trans_detail = f"{len(very_long_runs)} sustained runs at 40+ WPM, {delete_ratio*100:.1f}% correction rate, {format_count} formatting changes"
    elif len(long_runs) > 2 and delete_ratio < 0.05 and format_count < 3:
        transcription_score = 50
        risk_flags.append({
            "level": "warning",
            "message": f"Warning: Linear typing pattern with low corrections — monitor for transcription ({len(long_runs)} runs, {delete_ratio*100:.1f}% correction)"
        })
        trans_detail = f"{len(long_runs)} sustained runs, {delete_ratio*100:.1f}% correction rate, {format_count} formatting changes"
    elif delete_ratio < 0.02 and avg_wpm > 40 and total_minutes > 3:
        transcription_score = 40
        risk_flags.append({
            "level": "warning",
            "message": "Warning: Low correction rate with high WPM — monitor for transcription"
        })
        trans_detail = f"Low correction ({delete_ratio*100:.1f}%) at {avg_wpm:.0f} WPM, {format_count} formatting changes"

    factors["transcription_pattern"] = {
        "score": round(transcription_score), "weight": 15,
        "label": "Transcription Pattern",
        "detail": trans_detail
    }

    # --- Compute weighted score with relevance scaling ---
    # Use effective_paste_ratio for relevance (not raw paste_ratio)
    processed_factors = {}
    for name, f in factors.items():
        scaled = dict(f)
        if name != "paste_ratio":
            relevance = max(0.05, 1.0 - effective_paste_ratio)
            scaled["score"] = round(f["score"] * relevance)
            scaled["detail"] = f["detail"] + f" (relevance: {relevance*100:.0f}%)"
        processed_factors[name] = scaled

    total_weight = sum(f["weight"] for f in processed_factors.values())
    weighted_sum = sum(f["score"] * f["weight"] for f in processed_factors.values())
    overall = round(weighted_sum / total_weight) if total_weight > 0 else 0

    if any(f["score"] == 0 for f in processed_factors.values()):
        overall = min(overall, 40)

    if overall >= 80:
        verdict = "Likely Original"
        confidence = "high"
    elif overall >= 60:
        verdict = "Moderate Confidence"
        confidence = "medium"
    elif overall >= 40:
        verdict = "Suspicious"
        confidence = "medium"
    else:
        verdict = "High Risk of Academic Dishonesty"
        confidence = "high"

    if avg_wpm > 55 and delete_ratio < 0.02 and cursor_jumps == 0 and total_minutes > 15:
        risk_flags.append({
            "level": "critical",
            "message": "ALGORITHM FLAG: Linear Transcription Anomaly — WPM > 55, Backspace < 2%, No cursor jumps, > 15 min"
        })

    return {
        "overall_score": overall,
        "verdict": verdict,
        "confidence": confidence,
        "factors": processed_factors,
        "risk_flags": risk_flags
    }


def _find_sustained_runs(keystroke_events, max_gap=3.0):
    """Find runs of consecutive keystrokes without pauses longer than max_gap seconds."""
    if len(keystroke_events) < 2:
        return []
    runs = []
    current_run = [keystroke_events[0]]
    for i in range(1, len(keystroke_events)):
        gap = keystroke_events[i]["occurred_at"] - keystroke_events[i-1]["occurred_at"]
        if gap <= max_gap:
            current_run.append(keystroke_events[i])
        else:
            if len(current_run) >= 10:
                duration = current_run[-1]["occurred_at"] - current_run[0]["occurred_at"]
                wpm = (len(current_run) / 5) / max(duration / 60, 0.016)
                runs.append({"count": len(current_run), "duration": duration, "wpm": wpm})
            current_run = [keystroke_events[i]]
    if len(current_run) >= 10:
        duration = current_run[-1]["occurred_at"] - current_run[0]["occurred_at"]
        wpm = (len(current_run) / 5) / max(duration / 60, 0.016)
        runs.append({"count": len(current_run), "duration": duration, "wpm": wpm})
    return runs


def _count_slice_text(content):
    if not content:
        return 0
    total = 0
    for node in content:
        if isinstance(node, dict):
            if "text" in node:
                total += len(node["text"])
            elif "content" in node:
                total += _count_slice_text(node["content"])
    return total


def _estimate_doc_size(doc):
    if not doc:
        return 0
    size = 0
    for node in doc.get("content", []):
        if node.get("type") == "text":
            size += len(node.get("text", ""))
        elif "content" in node:
            for child in node["content"]:
                if child.get("type") == "text":
                    size += len(child.get("text", ""))
    return size