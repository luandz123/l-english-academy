import os
import subprocess
import sys
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PYTHON_EXEC = os.path.join(SCRIPT_DIR, ".venv", "bin", "python3")

scripts = [
    "consolidate_course_nang_cao.py",
    "consolidate_course_thuc_te.py",
    "consolidate_course_2022.py",
    "consolidate_course_2023.py",
    "consolidate_course_2024.py",
    "consolidate_course_2025.py",
    "consolidate_course.py"
]

LOG_FILE = os.path.join(SCRIPT_DIR, "crawl_progress.log")

def log_msg(message, end='\n'):
    print(message, end=end, flush=True)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(message + end)
    except Exception:
        pass

def run_script(script_name):
    script_path = os.path.join(SCRIPT_DIR, script_name)
    if not os.path.exists(script_path):
        log_msg(f"❌ Script not found: {script_name}")
        return False
        
    log_msg(f"\n==========================================")
    log_msg(f"🚀 Running: {script_name}")
    log_msg(f"==========================================")
    
    cmd = [PYTHON_EXEC, "-u", script_path]
    try:
        # Stream output in real-time
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
        
        for line in process.stdout:
            print(line, end='', flush=True)
            try:
                with open(LOG_FILE, "a", encoding="utf-8") as f:
                    f.write(line)
            except Exception:
                pass
            
        process.wait()
        if process.returncode == 0:
            log_msg(f"✅ Finished {script_name} successfully!")
            return True
        else:
            log_msg(f"❌ Script {script_name} failed with return code {process.returncode}")
            return False
    except Exception as e:
        log_msg(f"💥 Exception running {script_name}: {e}")
        return False

def main():
    # Clear the log file at startup
    try:
        with open(LOG_FILE, "w", encoding="utf-8") as f:
            f.write("=== CRAWL RUN PROGRESS LOG ===\n")
    except Exception:
        pass

    start_time = time.time()
    results = {}
    
    for script in scripts:
        success = run_script(script)
        results[script] = success
        # Brief pause between courses
        time.sleep(2)
        
    end_time = time.time()
    duration = end_time - start_time
    
    log_msg("\n==========================================")
    log_msg("📊 CRAWL RUN SUMMARY")
    log_msg(f"Duration: {duration:.2f} seconds")
    log_msg("==========================================")
    for script, success in results.items():
        status = "✅ SUCCESS" if success else "❌ FAILED"
        log_msg(f"{script:35s}: {status}")
    log_msg("==========================================")

if __name__ == "__main__":
    main()
