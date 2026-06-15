#!/usr/bin/env python3
import json
import os
import sys
from datetime import datetime
from collections import defaultdict

LOG_FILE = "./downloads_audit.jsonl"

def format_time(ts_str):
    try:
        # e.g., "2026-06-15T06:51:18+00:00"
        dt = datetime.fromisoformat(ts_str)
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return ts_str[:19].replace("T", " ")

def main():
    if not os.path.exists(LOG_FILE):
        print(f"Error: Audit log file '{LOG_FILE}' not found.")
        print("No downloads have been logged yet.")
        sys.exit(0)

    started_count = 0
    completed_count = 0
    failed_count = 0
    
    # Store history list
    history = []
    # Store stats by client IP
    client_stats = defaultdict(lambda: {"started": 0, "completed": 0, "failed": 0})
    # Store stats by platform
    platform_stats = defaultdict(lambda: {"started": 0, "completed": 0, "failed": 0})

    def get_platform(url):
        url_lower = url.lower()
        if "youtube" in url_lower or "youtu.be" in url_lower:
            return "YouTube"
        elif "instagram" in url_lower:
            return "Instagram"
        elif "facebook" in url_lower or "fbcdn" in url_lower or "fb.watch" in url_lower:
            return "Facebook"
        elif "twitter" in url_lower or "x.com" in url_lower:
            return "X (Twitter)"
        elif "missav" in url_lower or "surrit.com" in url_lower:
            return "MissAV"
        else:
            return "Generic / Web"

    with open(LOG_FILE, "r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            try:
                entry = json.loads(line)
                event = entry.get("event", "")
                url = entry.get("url", "")
                ip = entry.get("client_ip", "unknown")
                platform = get_platform(url)

                if event == "started":
                    started_count += 1
                    client_stats[ip]["started"] += 1
                    platform_stats[platform]["started"] += 1
                elif event == "completed":
                    completed_count += 1
                    client_stats[ip]["completed"] += 1
                    platform_stats[platform]["completed"] += 1
                elif event == "failed":
                    failed_count += 1
                    client_stats[ip]["failed"] += 1
                    platform_stats[platform]["failed"] += 1

                history.append({
                    "time": format_time(entry.get("timestamp", "")),
                    "event": event.upper(),
                    "ip": ip,
                    "platform": platform,
                    "filename": entry.get("filename", ""),
                    "error": entry.get("error") or ""
                })
            except Exception as e:
                pass

    print("=" * 60)
    print("                VIDLORD DOWNLOAD AUDIT SUMMARY                ")
    print("=" * 60)
    print(f"Total Downloads Initiated : {started_count}")
    print(f"Completed Successfully   : {completed_count}")
    print(f"Failed Downloads         : {failed_count}")
    if started_count > 0:
        success_rate = (completed_count / started_count) * 100
        print(f"Overall Success Rate     : {success_rate:.1f}%")
    print("=" * 60)

    print("\n[Platform Stats]")
    print(f"{'Platform':<15} | {'Started':<8} | {'Completed':<9} | {'Failed':<8}")
    print("-" * 50)
    for plat, stats in sorted(platform_stats.items(), key=lambda x: x[1]["started"], reverse=True):
        print(f"{plat:<15} | {stats['started']:<8} | {stats['completed']:<9} | {stats['failed']:<8}")

    print("\n[Client IP Stats]")
    print(f"{'Client IP':<20} | {'Started':<8} | {'Completed':<9} | {'Failed':<8}")
    print("-" * 55)
    for ip, stats in sorted(client_stats.items(), key=lambda x: x[1]["started"], reverse=True):
        print(f"{ip:<20} | {stats['started']:<8} | {stats['completed']:<9} | {stats['failed']:<8}")

    print("\n[Download History (Last 25 entries)]")
    history_slice = history[-25:]
    print(f"{'Time':<19} | {'Event':<9} | {'Client IP':<15} | {'Platform':<10} | {'File / Error'}")
    print("-" * 80)
    for h in reversed(history_slice):
        detail = h["filename"]
        if h["event"] == "FAILED" and h["error"]:
            detail = f"ERROR: {h['error']}"
        print(f"{h['time']:<19} | {h['event']:<9} | {h['ip']:<15} | {h['platform']:<10} | {detail}")
    print("=" * 80)

if __name__ == "__main__":
    main()
