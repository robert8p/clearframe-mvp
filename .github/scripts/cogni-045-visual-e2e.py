#!/usr/bin/env python3
"""Verify the installed Cogni APK, not a web mock or generated concept."""
import importlib.util,json,os,time,xml.etree.ElementTree as ET
from pathlib import Path
ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('reliable',ROOT/'cogni-auth-route-e2e-fixed.py')
runner=importlib.util.module_from_spec(spec);spec.loader.exec_module(runner)
ui=runner.load_suite(ROOT/'cogni-copy-feedback-e2e.py');runner.install_reliable_automation(ui)
ui.OUT=Path('/tmp/cogni-060-visual');ui.OUT.mkdir(exist_ok=True)

def top(label):
    ui.scroll_to_top();ui.wait_for(label,timeout=50)

def assert_nav():
    for name in ['Home','Skills','Train','Progress','Profile']:
        node=ui.wait_for(name,timeout=15)
        assert node.enabled and node.bounds[2]>node.bounds[0],name+' is inaccessible'

def main():
    results={'status':'running','physicalDeviceTested':False,'visualSystem':'Cogni 0.6 Connected Knowledge'}
    try:
        ui.adb('install','-r',os.environ['APK_PATH']);ui.adb('logcat','-c')
        ui.adb('shell','am','start','-W','-n',ui.ACTIVITY);time.sleep(5)
        for scale,label in [('1.0','normal'),('1.6','large')]:
            ui.adb('shell','settings','put','system','font_scale',scale);time.sleep(3)
            top('Sharpen how you think.');ui.capture('welcome-'+label)
            ui.wait_for('Try a sample decision',enabled=True,scroll=True);ui.capture('welcome-actions-'+label)
            ui.tap('Try a sample decision',scroll=True);top('A decision worth a pause.');ui.capture('sample-'+label)
            ui.tap('Check an original source supports the claim',scroll=True);ui.capture('sample-selected-'+label)
            ui.tap('See the reasoning',scroll=True);ui.wait_for('Confidence is not evidence.',scroll=True);ui.capture('sample-reasoning-'+label)
            ui.tap('Back to welcome',scroll=True);top('Sharpen how you think.')
            results['welcomeAndSample-'+label]='passed'
        ui.adb('shell','settings','put','system','font_scale','1.0');time.sleep(3)
        ui.tap('I already have an account',scroll=True);ui.wait_for('Welcome back')
        ui.input_text('Email',os.environ['E2E_EMAIL']);ui.input_text('Password',os.environ['E2E_PASSWORD'],scroll=True)
        ui.tap('Sign in',scroll=True);ui.wait_for('Home',timeout=60);ui.tap('Home');top('A brighter day, Cogni')
        ui.capture('home-top');assert_nav()
        ui.wait_for('Explore your thinking',scroll=True);ui.capture('home-skills')
        ui.scroll_to_top();ui.tap('Save key idea',scroll=True);ui.wait_for('Key idea saved',timeout=30)
        ui.scroll_to_top();ui.tap('Open saved ideas',scroll=True);top('Your thinking toolkit')
        ui.tap('3 days a week',scroll=True);ui.capture('toolkit-weekly')
        ui.tap('Reveal idea',scroll=True);ui.wait_for('Hide idea',scroll=True);ui.capture('toolkit-revealed')
        ui.adb('shell','input','keyevent','KEYCODE_BACK');time.sleep(2)
        ui.tap('Train');ui.wait_for_train_landing();ui.capture('training-top')
        ui.tap('Start your check',scroll=True);ui.wait_for('Choose one',timeout=50);ui.capture('practice-question')
        ui.dump_ui('answer-options')
        tree=ET.fromstring((ui.OUT/'window-answer-options.xml').read_text())
        options=[n for n in tree.iter('node') if n.attrib.get('class') in ['android.widget.Button','android.widget.RadioButton'] and n.attrib.get('content-desc') and n.attrib['content-desc']!='Submit answer' and 'percent confident' not in n.attrib['content-desc']]
        assert options,'No actual answer control'
        ui.tap(options[0].attrib['content-desc']);ui.capture('practice-selected')
        ui.wait_for('Submit answer',scroll=True)
        if any('percent confident' in n.description for n in ui.dump_ui('confidence-choice')):
            ui.wait_for('Submit answer',enabled=False);ui.tap('60 percent confident',scroll=True)
        ui.capture('practice-confidence');ui.tap('Submit answer',scroll=True)
        ui.wait_for('Next question',timeout=60,scroll=True);ui.capture('practice-feedback')
        ui.tap('Save key idea',scroll=True);ui.wait_for('Key idea saved',timeout=30);ui.capture('practice-saved')
        ui.tap('Progress');top('Your learning, in orbit');ui.capture('progress-top');assert_nav()
        ui.wait_for('Recent performance',scroll=True);ui.capture('progress-ring')
        ui.tap('Home');top('A brighter day, Cogni')
        ui.wait_for('1 of 3 practice days',scroll=True);ui.capture('home-weekly')
        results['signedInNormal']='passed; actual answer and private ideas saved'
        ui.adb('shell','settings','put','system','font_scale','1.6');time.sleep(3)
        top('A brighter day, Cogni');ui.capture('home-large');assert_nav()
        ui.wait_for('Explore your thinking',scroll=True);ui.capture('home-skills-large')
        ui.tap('Progress');top('Your learning, in orbit');ui.capture('progress-large')
        ui.wait_for('Recent performance',scroll=True);ui.capture('progress-score-large')
        ui.tap('Home');top('A brighter day, Cogni');ui.tap('Open saved ideas',scroll=True);top('Your thinking toolkit');ui.capture('toolkit-large')
        ui.tap('Reveal idea',scroll=True);ui.wait_for('Hide idea',scroll=True);ui.capture('toolkit-revealed-large')
        ui.assert_no_fatal_crash();results['signedInLarge']='passed';results['status']='passed'
        print('PASS: actual welcome, sample, home, training, answer, confidence, feedback, progress and saved ideas; normal and 160% text.')
    except Exception as error:
        results['status']='failed';results['error']=str(error);ui.capture('failure');raise
    finally:
        ui.adb('shell','settings','put','system','font_scale','1.0',check=False)
        (ui.OUT/'result.json').write_text(json.dumps(results,indent=2))
if __name__=='__main__':main()
