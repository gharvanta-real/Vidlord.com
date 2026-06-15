#!/usr/bin/env python3
import json
import os
import sys
from datetime import datetime
from collections import defaultdict

LOG_PATHS = [
    "/home/ubuntu/vidlord/downloads_audit.jsonl",
    "./downloads_audit.jsonl",
    "./vidlord/downloads_audit.jsonl",
    "./vidlord-scraper/downloads_audit.jsonl"
]

def format_time(ts_str):
    try:
        # e.g., "2026-06-15T06:51:18+00:00"
        dt = datetime.fromisoformat(ts_str)
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return ts_str[:19].replace("T", " ")

def format_size(bytes_val):
    if bytes_val is None:
        return "-"
    try:
        bytes_val = float(bytes_val)
    except (ValueError, TypeError):
        return "-"
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes_val < 1024.0:
            return f"{bytes_val:.2f} {unit}"
        bytes_val /= 1024.0
    return f"{bytes_val:.2f} PB"

def main():
    log_file = None
    for path in LOG_PATHS:
        if os.path.exists(path):
            log_file = path
            break

    if not log_file:
        print("Error: Audit log file not found.")
        print(f"Checked paths: {LOG_PATHS}")
        print("No downloads have been logged yet.")
        sys.exit(0)

    started_count = 0
    completed_count = 0
    failed_count = 0
    total_size_bytes = 0.0
    
    # Store history list
    history = []
    # Store stats by client IP
    client_stats = defaultdict(lambda: {"started": 0, "completed": 0, "failed": 0})
    client_sizes = defaultdict(float)
    # Store stats by platform
    platform_stats = defaultdict(lambda: {"started": 0, "completed": 0, "failed": 0})
    platform_sizes = defaultdict(float)

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

    with open(log_file, "r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            try:
                entry = json.loads(line)
                event = entry.get("event", "")
                url = entry.get("url", "")
                ip = entry.get("client_ip", "unknown")
                platform = get_platform(url)
                size = entry.get("size")

                if event == "started":
                    started_count += 1
                    client_stats[ip]["started"] += 1
                    platform_stats[platform]["started"] += 1
                elif event == "completed":
                    completed_count += 1
                    client_stats[ip]["completed"] += 1
                    platform_stats[platform]["completed"] += 1
                    if size is not None:
                        try:
                            s_val = float(size)
                            total_size_bytes += s_val
                            client_sizes[ip] += s_val
                            platform_sizes[platform] += s_val
                        except (ValueError, TypeError):
                            pass
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
                    "size": size,
                    "error": entry.get("error") or ""
                })
            except Exception as e:
                pass

    print("=" * 65)
    print("                VIDLORD DOWNLOAD AUDIT SUMMARY                ")
    print("=" * 65)
    print(f"Total Downloads Initiated : {started_count}")
    print(f"Completed Successfully   : {completed_count}")
    print(f"Failed Downloads         : {failed_count}")
    if started_count > 0:
        success_rate = (completed_count / started_count) * 100
        print(f"Overall Success Rate     : {success_rate:.1f}%")
    print(f"Total Data Downloaded    : {format_size(total_size_bytes)}")
    if completed_count > 0:
        avg_size = total_size_bytes / completed_count
        print(f"Average Download Size    : {format_size(avg_size)}")
    print("=" * 65)

    print("\n[Platform Stats]")
    print(f"{'Platform':<15} | {'Started':<8} | {'Completed':<9} | {'Failed':<8} | {'Total Size'}")
    print("-" * 65)
    for plat, stats in sorted(platform_stats.items(), key=lambda x: x[1]["started"], reverse=True):
        size_str = format_size(platform_sizes[plat])
        print(f"{plat:<15} | {stats['started']:<8} | {stats['completed']:<9} | {stats['failed']:<8} | {size_str}")

    print("\n[Client IP Stats]")
    print(f"{'Client IP':<20} | {'Started':<8} | {'Completed':<9} | {'Failed':<8} | {'Total Size'}")
    print("-" * 70)
    for ip, stats in sorted(client_stats.items(), key=lambda x: x[1]["started"], reverse=True):
        size_str = format_size(client_sizes[ip])
        print(f"{ip:<20} | {stats['started']:<8} | {stats['completed']:<9} | {stats['failed']:<8} | {size_str}")

    print("\n[Download History (Last 25 entries)]")
    history_slice = history[-25:]
    print(f"{'Time':<19} | {'Event':<9} | {'Client IP':<15} | {'Platform':<10} | {'Size':<10} | {'File / Error'}")
    print("-" * 95)
    for h in reversed(history_slice):
        detail = h["filename"]
        if h["event"] == "FAILED" and h["error"]:
            detail = f"ERROR: {h['error']}"
        size_str = format_size(h["size"]) if h["event"] == "COMPLETED" else "-"
        print(f"{h['time']:<19} | {h['event']:<9} | {h['ip']:<15} | {h['platform']:<10} | {size_str:<10} | {detail}")
    print("=" * 95)

if __name__ == "__main__":
    main()
