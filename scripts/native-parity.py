"""Private, isolated SOMA render check. Requires the local game and Frida/Pillow.

Creates a copy of the user's sample-map files under .cache, replaces only that
copy's GUI callback, redirects the test process's profile folder, and captures
OpenGL pixels without driving the user's mouse/keyboard. Never patches game files.
"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import sys
import threading
import tempfile
import time
import frida
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--game-root', type=Path, required=True)
    parser.add_argument('--reconstruction-root', type=Path, required=True)
    args = parser.parse_args()
    game = args.game_root.resolve()
    out = ROOT / '.cache/native-parity'
    out.mkdir(parents=True, exist_ok=True)
    documents = out / 'documents'
    documents.mkdir(exist_ok=True)
    sample = game / 'mods/MinimalCustomMapMod/maps/sample_map'
    target = out / 'maps/sample_map'
    target.mkdir(parents=True, exist_ok=True)
    for path in sample.glob('sample_map.*'):
        shutil.copyfile(path, target / path.name)
    script = (target / 'sample_map.hps').read_text(encoding='utf-8')
    generated = (ROOT / '.cache/preview-lab/parity.hps').read_text(encoding='utf-8') + '\n' + (ROOT / '.cache/preview-lab/catalog.hps').read_text(encoding='utf-8')
    generated = '\n'.join(line for line in generated.splitlines() if not line.startswith('#include'))
    start = script.index('void GeneratedTerminal_OnGui(')
    brace = script.index('{', start)
    depth = 1
    end = brace + 1
    while depth:
        if script[end] == '{': depth += 1
        elif script[end] == '}': depth -= 1
        end += 1
    script = script[:start] + generated + script[end:]
    document = json.loads((ROOT / 'test/fixtures/parity-document.json').read_text())
    resolution = document['previewResolution']
    script = script.replace('StationGui_PreloadDefault();', f'''StationGui_PreloadDefault();
        // Match the editor's GUI virtual size, independently of the OS viewport.
        cLux_GetCurrentImGui().GetSet().SetVirtualSize(cVector2f({resolution['x']}, {resolution['y']}), -1000, 1000, cVector2f_Zero);
        cLux_GetCurrentImGui().SetDefaultFont(cImGuiFont("default_small.fnt", cVector2f(17)));
        GeneratedTerminal_OnGui("", afTimeStep);''')
    (target / 'sample_map.hps').write_text(script, encoding='utf-8')
    settings = (game / 'config/default_user_settings.cfg').read_text(encoding='utf-8')
    import re
    settings = re.sub(r'<Screen\b[^>]*/>', '<Screen Width="800" Height="600" FullScreen="false" VSync="false" />', settings)
    settings = re.sub(r'<Main\b[^>]*/>', '<Main DebugMode="true" ShowMenu="false" ShowPreMenu="false" SaveConfig="false" GenerateScriptAPI="false" />', settings)
    settings = re.sub(r'<Menu\b[^>]*/>', '<Menu ShowMenu="false" />', settings)
    if '<Screen ' not in settings: settings += '\n<Screen Width="800" Height="600" FullScreen="false" VSync="false" />'
    if '<Main ' not in settings: settings += '\n<Main DebugMode="true" ShowMenu="false" ShowPreMenu="false" SaveConfig="false" GenerateScriptAPI="false" />'
    if '<Menu ' not in settings: settings += '\n<Menu ShowMenu="false" />'
    (out / 'settings.cfg').write_text(settings, encoding='utf-8')
    config = (game / 'config/main_init.cfg').read_text(encoding='utf-8')
    config = re.sub(r'DefaultUserSettings\s*=\s*"[^"]*"', f'DefaultUserSettings="{(out / "settings.cfg").as_posix()}"', config)
    config = re.sub(r'MainSaveFolder\s*=\s*"[^"]*"', 'MainSaveFolder="GuiDesignerParity"', config)
    (out / 'main_init.cfg').write_text(config, encoding='utf-8')
    exe = game / 'Soma_NoSteam.exe'
    expected = json.loads((args.reconstruction_root / 'config/analysis.json').read_text())['expected_sha256']
    if hashlib.sha256(exe.read_bytes()).hexdigest().upper() != expected.upper():
        raise RuntimeError('The game binary differs from the verified reconstruction')
    sys.dont_write_bytecode = True
    sys.path.insert(0, str(args.reconstruction_root / 'scripts/python'))
    from pe_image import PEImage
    pe = PEImage.from_path(exe)
    peoff = pe.unpack_file(0x3c, '<I')[0]
    directory = pe.unpack_file(peoff + 24 + 120, '<I')[0]
    slot = None
    while True:
        original, _, _, name, first = pe.read(directory, '<IIIII')
        if not name: break
        index = 0
        while True:
            entry = pe.read((original or first) + index * 8, '<Q')[0]
            if not entry: break
            if not entry & (1 << 63) and pe.cstring(entry + 2) == 'SHGetFolderPathW': slot = first + index * 8
            index += 1
        directory += 20
    if slot is None: raise RuntimeError('Profile redirection import not found')
    code = r'''
const slot=Process.mainModule.base.add(__SLOT__);
for(const mod of ['user32.dll'])for(const fn of ['MessageBoxW','MessageBoxA']){
  const address=Process.getModuleByName(mod).getExportByName(fn);
  Interceptor.attach(address,{onEnter(a){send({kind:'startup-dialog',text:fn.endsWith('W')?a[1].readUtf16String():a[1].readUtf8String()});}});
}
const original=new NativeFunction(slot.readPointer(),'int',['pointer','int','pointer','uint','pointer']);
const redirect=new NativeCallback((window,id,token,flags,out)=>{
  if([5,0x1a,0x1c].includes(id & 0xff)){out.writeUtf16String(__DOCS__);send({kind:'profile-redirect',id});return 0;}
  return original(window,id,token,flags,out);
},'int',['pointer','int','pointer','uint','pointer']);
Memory.protect(slot,Process.pointerSize,'rw-');slot.writePointer(redirect);
let swaps=0,draws=0,captured=false,lastViewport=[];
const imageEvidence={};
Interceptor.attach(Process.mainModule.base.add(0x303120),{
  onEnter(a){this.gfx=a[1];},onLeave(ret){
    if(draws<2000||Object.keys(imageEvidence).length>40)return;
    try{const field=this.gfx.add(0xa0),n=field.add(16).readU64().toNumber();if(!n||n>200)return;
      const file=(field.add(24).readU64().toNumber()<16?field:field.readPointer()).readUtf8String(n);
      if(imageEvidence[file])return;
      const image=ret.add(0x80).readPointer();
      imageEvidence[file]={size:[ret.add(0x4c).readFloat(),ret.add(0x50).readFloat()],atlas:[image.add(0xb8).readS32(),image.add(0xbc).readS32()]};
    }catch(_){}
  }
});
// Keep this disposable process updating while the user keeps their real focus.
// Reconstructed cLowLevelInputSDL focus query; no OS focus or input is changed.
Interceptor.attach(Process.mainModule.base.add(0x432ac0),{onLeave(ret){ret.replace(ptr(1));}});
rpc.exports={status(){return {swaps,draws,captured,lastViewport,imageEvidence,frame:Process.mainModule.base.add(0x792710).readS32()};}};
Interceptor.attach(Process.mainModule.base.add(0x306430),{onEnter(a){draws++;}});
const gl=Process.getModuleByName('opengl32.dll');
const get=new NativeFunction(gl.getExportByName('glGetIntegerv'),'void',['uint','pointer']);
const pixels=new NativeFunction(gl.getExportByName('glReadPixels'),'void',['int','int','int','int','uint','uint','pointer']);
// SDL's dynamic API can bypass its exported trampoline. Observe the pinned
// native graphics wrapper, as the reconstruction's renderer probes do.
Interceptor.attach(Process.mainModule.base.add(0x435780),{onEnter(){
  swaps++;if(captured||swaps<1200||draws<2000)return;
  const vp=Memory.alloc(16);get(0xba2,vp);const w=vp.add(8).readS32(),h=vp.add(12).readS32();lastViewport=[w,h];
  if(w!==800||h!==600)return;
  const b=Memory.alloc(w*h*4);pixels(0,0,w,h,0x1908,0x1401,b);captured=true;
  send({kind:'capture',width:w,height:h,swaps,draws},b.readByteArray(w*h*4));
}});
'''.replace('__SLOT__', str(slot)).replace('__DOCS__', json.dumps(str(documents)))
    device = frida.get_local_device()
    # HPL's command-line parser treats '-' inside a quoted argument as a new
    # option. Keep its CLI inputs in a private, hyphen-free temporary directory.
    cli = Path(tempfile.mkdtemp(prefix='SomaGuiParity'))
    if '-' in str(cli) or ' ' in str(cli): raise RuntimeError('The native CLI test requires a temp path without spaces or hyphens')
    shutil.copyfile(out / 'main_init.cfg', cli / 'main_init.cfg')
    shutil.copytree(target, cli / 'map')
    # Explicitly register the private map with HPL's resource index.
    resources = (game / 'resources.cfg').read_text(encoding='utf-8').replace('</Resources>', f'<Directory Path="{(cli / "map").as_posix()}" AddSubDirs="true"/>\n</Resources>')
    (cli / 'resources.cfg').write_text(resources, encoding='utf-8')
    config = re.sub(r'Resources\s*=\s*"[^"]*"', f'Resources="{(cli / "resources.cfg").as_posix()}"', config)
    (cli / 'main_init.cfg').write_text(config, encoding='utf-8')
    manifest = {'argv': [str(exe), '-cfg', str(cli / 'main_init.cfg'), '-user', 'GuiDesignerParity', '-map', 'sample_map.hpm', '-mapfolder', (cli / 'map').as_posix() + '/'], 'status': 'starting'}
    ready = threading.Event()
    rows = []
    pid = None
    try:
        print('Spawning isolated SOMA process', flush=True)
        pid = device.spawn(manifest['argv'], cwd=str(game))
        manifest['pid'] = pid
        session = device.attach(pid)
        agent = session.create_script(code)
        def message(row, data):
            rows.append(row)
            if row.get('type') == 'send' and row['payload'].get('kind') == 'capture':
                p = row['payload']; Image.frombytes('RGBA', (p['width'], p['height']), data).transpose(Image.Transpose.FLIP_TOP_BOTTOM).save(out / 'native.png')
                manifest.update(status='captured', capture=p); ready.set()
            elif row.get('type') == 'error': manifest.update(status='probe-error'); ready.set()
            elif row.get('type') == 'send' and row['payload'].get('kind') == 'startup-dialog': manifest.update(status='startup-dialog', dialog=row['payload']['text']); ready.set()
        agent.on('message', message)
        agent.load(); device.resume(pid)
        print('SOMA resumed; waiting for GUI draw', flush=True)
        ready.wait(40)
        try: manifest['probe'] = agent.exports_sync.status()
        except frida.InvalidOperationError: manifest['probe'] = 'game process ended'
        if not ready.is_set(): manifest['status'] = 'capture-timeout'
    finally:
        if pid is not None:
            try: device.kill(pid)
            except frida.ProcessNotFoundError: pass
        (out / 'events.json').write_text(json.dumps(rows, indent=2))
        (out / 'manifest.json').write_text(json.dumps(manifest, indent=2))
        print(json.dumps(manifest))
        for path in documents.rglob('hpl.log'):
            for attempt in range(10):
                try: shutil.copyfile(path, out / 'hpl.log'); break
                except PermissionError: time.sleep(0.2)
        if cli.resolve().parent == Path(tempfile.gettempdir()).resolve() and cli.name.startswith('SomaGuiParity'):
            shutil.rmtree(cli)
    if manifest['status'] != 'captured': raise RuntimeError(manifest['status'])

if __name__ == '__main__': main()
