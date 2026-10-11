"""
CivicSetu — Project Review Mode Toggle Utility
----------------------------------------------
Usage:
    python toggle_review_mode.py review1    # Locks to Review 1 (35% scope: Auth + Citizen Grievance subsystem)
    python toggle_review_mode.py full       # Opens 100% full project (Review 2/Final: Authority Hub, SuperAdmin, AI, GIS Map)
    python toggle_review_mode.py status     # Checks active review mode
"""

import sys
import re
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
ENV_FILE = ROOT_DIR / ".env"
FRONTEND_CONFIG = ROOT_DIR / "frontend" / "src" / "config" / "reviewConfig.ts"


def set_backend_phase(phase: int):
    if not ENV_FILE.exists():
        return
    content = ENV_FILE.read_text(encoding="utf-8")
    if "REVIEW_PHASE=" in content:
        content = re.sub(r"REVIEW_PHASE=\d+", f"REVIEW_PHASE={phase}", content)
    else:
        content += f"\nREVIEW_PHASE={phase}\n"
    ENV_FILE.write_text(content, encoding="utf-8")


def set_frontend_phase(phase: int):
    if not FRONTEND_CONFIG.exists():
        return
    content = FRONTEND_CONFIG.read_text(encoding="utf-8")
    content = re.sub(r"export const REVIEW_PHASE: number = \d+;", f"export const REVIEW_PHASE: number = {phase};", content)
    FRONTEND_CONFIG.write_text(content, encoding="utf-8")


def get_current_phase():
    phase = 1
    if FRONTEND_CONFIG.exists():
        content = FRONTEND_CONFIG.read_text(encoding="utf-8")
        m = re.search(r"export const REVIEW_PHASE: number = (\d+);", content)
        if m:
            phase = int(m.group(1))
    return phase


def main():
    args = sys.argv[1:]
    if not args or args[0] in ["status", "-s", "--status"]:
        phase = get_current_phase()
        if phase == 1:
            print("\n[ACTIVE MODE]: REVIEW 1 MODE (35% SCOPE)")
            print("  - Active: Authentication, Citizen Dashboard, File Grievance, My Grievances, Track Status, Departments")
            print("  - In Background: Authority Hub, Super Admin, AI Classification, GIS Map, Audit Logs\n")
        else:
            print("\n[ACTIVE MODE]: FULL CODEBASE (100% SCOPE)")
            print("  - All modules fully visible and functional.\n")
        return

    cmd = args[0].lower()
    if cmd in ["1", "review1", "r1", "review", "phase1"]:
        set_backend_phase(1)
        set_frontend_phase(1)
        print("\n[SUCCESS] SWITCHED TO: REVIEW 1 MODE (35% SCOPE)")
        print("  - Only 35% of the codebase (Core Architecture & Citizen Grievance Subsystem) is active and visible.")
        print("  - All remaining 65% code (Authority Hub, SuperAdmin, AI, GIS Map) is safely preserved in background.")
        print("  - Run 'python toggle_review_mode.py full' at any time to open everything back up.\n")

    elif cmd in ["full", "2", "all", "open", "review2", "r2", "complete"]:
        set_backend_phase(2)
        set_frontend_phase(2)
        print("\n[SUCCESS] SWITCHED TO: FULL PROJECT (100% ALL CODE OPEN)")
        print("  - All subsystems (Authority Command Hub, SuperAdmin Portal, AI Triage, GIS Radar Map, Audit Trails) are now OPEN and active.\n")
    else:
        print(f"Unknown command '{cmd}'. Use 'review1', 'full', or 'status'.")


if __name__ == "__main__":
    main()
