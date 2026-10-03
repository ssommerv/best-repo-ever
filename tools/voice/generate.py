#!/usr/bin/env python3
"""Record the game's voice lines with ElevenLabs into docs/audio/.

Usage:
  ELEVENLABS_API_KEY=sk_... python3 tools/voice/generate.py [--dry-run] [--only PREFIX] [--limit N]

Only lines that are new or whose text changed are recorded (docs/audio/lines.json
remembers what each clip says), so re-running after a spelling-list change costs
only the new words. Afterwards run `node tools/voice/manifest.js`.
"""
import argparse, json, os, subprocess, sys, time, urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AUDIO = os.path.join(ROOT, 'docs', 'audio')
VOICE_ID = os.environ.get('ELEVENLABS_VOICE_ID', 'XiPS9cXxAVbaIWtGDHDh')  # Brittney
MODEL = 'eleven_multilingual_v2'
FORMAT = 'mp3_44100_64'
API = 'https://api.elevenlabs.io/v1'


def api(path, key, body=None):
    req = urllib.request.Request(API + path, headers={'xi-api-key': key, 'Content-Type': 'application/json'},
                                 data=json.dumps(body).encode() if body is not None else None)
    with urllib.request.urlopen(req, timeout=120) as res:
        return res.read()


def record(key, api_key, line):
    body = {'text': line['text'], 'model_id': MODEL}
    if line.get('prev'): body['previous_text'] = line['prev']
    if line.get('next'): body['next_text'] = line['next']
    if line.get('speed'): body['voice_settings'] = {'speed': line['speed']}
    for attempt in range(6):
        try:
            audio = api(f'/text-to-speech/{VOICE_ID}?output_format={FORMAT}', api_key, body)
            if audio[:1] == b'{': raise RuntimeError(audio[:300].decode('utf8', 'replace'))
            out = os.path.join(AUDIO, key + '.mp3')
            os.makedirs(os.path.dirname(out), exist_ok=True)
            with open(out, 'wb') as f: f.write(audio)
            return key
        except urllib.error.HTTPError as e:
            detail = e.read()[:300].decode('utf8', 'replace')
            if e.code in (429, 500, 502, 503, 504) and attempt < 5:
                time.sleep(2 ** attempt + 1); continue
            raise RuntimeError(f'{key}: HTTP {e.code} {detail}')
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt < 5: time.sleep(2 ** attempt + 1); continue
            raise RuntimeError(f'{key}: {e}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--only', default='', help='record only keys starting with this prefix')
    ap.add_argument('--limit', type=int, default=0)
    ap.add_argument('--workers', type=int, default=3)
    args = ap.parse_args()

    lines = json.loads(subprocess.check_output(['node', os.path.join(ROOT, 'tools/voice/list-lines.js')]))
    done_path = os.path.join(AUDIO, 'lines.json')
    done = json.load(open(done_path)) if os.path.exists(done_path) else {}
    todo = [k for k, v in lines.items() if k.startswith(args.only)
            and (done.get(k) != v or not os.path.exists(os.path.join(AUDIO, k + '.mp3')))]
    if args.limit: todo = todo[:args.limit]
    chars = sum(len(lines[k]['text']) for k in todo)
    print(f'{len(lines)} lines total, {len(todo)} to record, ~{chars} characters')
    if args.dry_run or not todo: return

    api_key = os.environ.get('ELEVENLABS_API_KEY')
    if not api_key: sys.exit('Set ELEVENLABS_API_KEY')
    sub = json.loads(api('/user/subscription', api_key))
    left = sub['character_limit'] - sub['character_count']
    print(f"Credits left: {left} of {sub['character_limit']}")
    if chars > left: sys.exit('Not enough credits for this run.')

    failures = []
    with ThreadPoolExecutor(args.workers) as pool:
        jobs = {pool.submit(record, k, api_key, lines[k]): k for k in todo}
        for i, job in enumerate(as_completed(jobs), 1):
            k = jobs[job]
            try:
                job.result(); done[k] = lines[k]
            except Exception as e:
                failures.append(str(e))
            if i % 50 == 0 or i == len(todo):
                print(f'  {i}/{len(todo)} done, {len(failures)} failed', flush=True)
                with open(done_path, 'w') as f: json.dump(done, f, indent=0, sort_keys=True)
    sub = json.loads(api('/user/subscription', api_key))
    print(f"Credits used now: {sub['character_count']} of {sub['character_limit']}")
    if failures:
        print('Failures:', *failures[:10], sep='\n  '); sys.exit(1)


if __name__ == '__main__':
    main()
