#!/usr/bin/env python3
"""Installed APK checks for sample activation, private takeaways and optional rhythm."""
import importlib.util
import json
import os
from pathlib import Path
import time
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET
ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('reliable', ROOT / 'cogni-auth-route-e2e-fixed.py')
runner = importlib.util.module_from_spec(spec); spec.loader.exec_module(runner)
ui = runner.load_suite(ROOT / 'cogni-copy-feedback-e2e.py')
runner.install_reliable_automation(ui)
ui.OUT = Path('/tmp/cogni-044-tools'); ui.OUT.mkdir(exist_ok=True)
EMAIL = os.environ['E2E_EMAIL']; PASSWORD = os.environ['E2E_PASSWORD']
OTHER = EMAIL.replace('.route.', '.tools.')
URL = os.environ['SUPABASE_URL']; KEY = os.environ['SUPABASE_KEY']
def post(path, payload, token=None):
    headers = {'apikey': KEY, 'Content-Type': 'application/json'}
    if token: headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(URL + path, data=json.dumps(payload).encode(), headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=30) as response: return response.status, json.load(response)
    except urllib.error.HTTPError as error: return error.code, json.load(error)
def sign_in(email):
    ui.scroll_to_top(); ui.tap('I already have an account', scroll=True); ui.wait_for('Welcome back')
    ui.input_text('Email', email); ui.input_text('Password', PASSWORD, scroll=True); ui.tap('Sign in', scroll=True)
    ui.wait_for('Home', timeout=60); ui.tap('Home'); ui.scroll_to_top()
def sign_out():
    ui.adb('shell', 'input', 'keyevent', 'KEYCODE_BACK', check=False); time.sleep(1)
    ui.tap('Profile'); ui.scroll_to_top(); ui.tap('Sign out', scroll=True)
    ui.scroll_to_top(); ui.wait_for('Make room for a clearer perspective.')
def restart():
    ui.adb('shell', 'am', 'force-stop', ui.PACKAGE); ui.adb('shell', 'am', 'start', '-W', '-n', ui.ACTIVITY); time.sleep(5)
def toolkit():
    ui.adb('shell','am','start','-W','-a','android.intent.action.VIEW','-d','cogni://toolkit',ui.PACKAGE)
    time.sleep(2); ui.scroll_to_top(); ui.wait_for('Your thinking toolkit',timeout=40)
def absent(label):
    assert not any(ui.matches(n,label) for n in ui.dump_ui('absence')), 'Unexpected private content: '+label

def main():
    result = {'status': 'running', 'physicalDeviceTested': False}; other_token = None
    print('::add-mask::'+OTHER)
    try:
        restart(); ui.scroll_to_top(); ui.wait_for('Make room for a clearer perspective.'); ui.capture('welcome')
        ui.tap('Try a sample decision',scroll=True); ui.wait_for('A decision worth a pause.'); ui.capture('sample-first-question')
        cases=[('Check an original source supports the claim','Confidence is not evidence.','Try another decision'),('Find outcomes for people with a similar starting point','A memorable example is not a base rate.','Try another decision'),('Try a small, reversible test with a clear success measure','Use small tests to reduce uncertainty.','Finish the sample')]
        for i,(answer,principle,next_label) in enumerate(cases):
            ui.scroll_to_top(); ui.tap(answer,scroll=True); ui.tap('See the reasoning',scroll=True)
            ui.wait_for(principle,scroll=True); ui.capture(f'sample-reasoning-{i+1}'); ui.tap(next_label,scroll=True)
        ui.wait_for('Less guessing. More questioning.'); ui.capture('sample-complete'); ui.tap('Back to welcome',scroll=True)
        result['sampleThreeDecisions'] = 'passed'
        sign_in(EMAIL); ui.wait_for('Hello, Cogni',timeout=45); ui.capture('home')
        # This suite owns a separate fresh identity. Submit a real UI answer so
        # the local practice-day record is exercised, not seeded or mocked.
        ui.tap('Train'); ui.wait_for_train_landing()
        ui.tap('Start your check',scroll=True); ui.wait_for('Choose one',timeout=45)
        ui.dump_ui('answer-options')
        tree=ET.fromstring((ui.OUT/'window-answer-options.xml').read_text())
        options=[element for element in tree.iter('node')
                 if element.attrib.get('class') in ('android.widget.Button','android.widget.RadioButton')
                 and element.attrib.get('content-desc')
                 and element.attrib.get('content-desc')!='Submit answer'
                 and 'percent confident' not in element.attrib.get('content-desc','')]
        assert options,'No selectable answer in the starting check'
        ui.tap(options[0].attrib['content-desc'])
        ui.wait_for('Submit answer',scroll=True)
        if any('percent confident' in node.description for node in ui.dump_ui('confidence-choice')):
            ui.wait_for('Submit answer',enabled=False)
            ui.tap('60 percent confident',scroll=True)
        ui.tap('Submit answer',scroll=True)
        ui.wait_for('Next question',timeout=60,scroll=True); ui.capture('live-answer-before-saving')
        ui.tap('Home'); ui.wait_for('Hello, Cogni',timeout=45); ui.scroll_to_top()
        ui.tap('Save key idea',scroll=True); ui.wait_for('Key idea saved',timeout=25)
        ui.scroll_to_top(); ui.tap('Open saved ideas',scroll=True); ui.wait_for('Your thinking toolkit')
        ui.tap('3 days a week',scroll=True); ui.scroll_to_top(); ui.wait_for('1 of 3 practice days',scroll=True)
        ui.capture('weekly-rhythm'); ui.tap('Reveal idea',scroll=True); ui.wait_for('Hide idea',scroll=True); ui.capture('saved-idea-revealed')
        ui.tap('Share idea',scroll=True); time.sleep(2); ui.capture('native-share-sheet')
        ui.adb('shell','input','keyevent','KEYCODE_BACK'); time.sleep(2)
        ui.wait_for('Hide idea',scroll=True); ui.tap('Hide idea',scroll=True)
        result['saveRevealShareSheetAndPracticeDay'] = 'passed; share sheet cancelled without sending'
        restart(); ui.wait_for('Home',timeout=50); toolkit(); ui.wait_for('1 of 3 practice days',scroll=True); ui.tap('Reveal idea',scroll=True); ui.wait_for('Hide idea',scroll=True)
        result['coldRestartPersistence'] = 'passed'
        # Real connectivity is disabled; no mock response substitutes for offline review.
        ui.adb('shell','svc','wifi','disable'); ui.adb('shell','svc','data','disable'); time.sleep(2)
        restart(); time.sleep(15); toolkit(); ui.tap('Reveal idea',scroll=True); ui.wait_for('Hide idea',scroll=True); ui.capture('saved-idea-offline')
        result['offlineColdRestartReview'] = 'passed'
        ui.tap('Hide idea',scroll=True); ui.wait_for('Reveal idea',scroll=True)
        ui.adb('shell','svc','wifi','enable'); ui.adb('shell','svc','data','enable'); time.sleep(5)
        ui.adb('shell','settings','put','system','font_scale','1.6'); time.sleep(3)
        ui.scroll_to_top(); ui.wait_for('Your thinking toolkit'); ui.capture('toolkit-large-text'); ui.wait_for('1 recorded practice day this week.',scroll=True)
        ui.tap('Reveal idea',scroll=True); ui.wait_for('Hide idea',scroll=True); ui.capture('saved-idea-large-text')
        ui.adb('shell','settings','put','system','font_scale','1.0'); time.sleep(2)
        result['largeTextToolkit'] = 'passed'
        sign_out(); ui.adb('shell','am','start','-W','-a','android.intent.action.VIEW','-d','cogni://toolkit',ui.PACKAGE); time.sleep(3); ui.scroll_to_top(); ui.wait_for('Make room for a clearer perspective.',timeout=45); absent('Reveal idea')
        # Provision a second disposable account through the public auth and app API.
        status, body = post('/auth/v1/signup', {'email':OTHER,'password':PASSWORD,'data':{'full_name':'Cogni Tools E2E'}})
        status, body = post('/auth/v1/token?grant_type=password', {'email':OTHER,'password':PASSWORD})
        assert status == 200 and body.get('access_token'); other_token = body['access_token']
        status,_=post('/functions/v1/mobile-api',{'path':'/api/mobile/profile','method':'POST','body':{'fullName':'Cogni Tools E2E','audienceSegment':'casual','functionArea':'everyday_decisions','primaryGoal':'think_more_clearly'},'context':{'timeZone':'Europe/London'}},other_token)
        assert status==200, 'Second identity context setup failed'
        sign_in(OTHER); toolkit(); ui.wait_for('An idea you’ll actually use.',scroll=True); absent('Reveal idea'); ui.scroll_to_top(); ui.wait_for('A little, often. At your pace.',scroll=True)
        result['secondAccountIsolation'] = 'passed'
        sign_out(); sign_in(EMAIL); toolkit(); ui.wait_for('1 of 3 practice days',scroll=True); ui.tap('Reveal idea',scroll=True); ui.wait_for('Hide idea',scroll=True)
        ui.tap('Remove saved idea',scroll=True); ui.wait_for('Remove saved idea?'); ui.tap('Keep'); ui.wait_for('Hide idea',scroll=True)
        ui.tap('Remove saved idea',scroll=True); ui.wait_for('Remove saved idea?'); ui.tap('Remove'); ui.wait_for('An idea you’ll actually use.',scroll=True)
        ui.tap('Clear device tools',scroll=True); ui.wait_for('Clear device practice tools?'); ui.tap('Clear device tools'); time.sleep(4); ui.scroll_to_top(); ui.wait_for('A little, often. At your pace.',scroll=True)
        result['removeCancelConfirmAndClear'] = 'passed'
        ui.capture('toolkit-cleared'); sign_out(); ui.assert_no_fatal_crash(); result['status']='passed'
        print('PASS: sample decisions, saving, recall, local goal, actual answer day, cancelled sharing, cold/offline restart, account isolation, deletion and large text.')
    except Exception as error:
        result['status']='failed'; result['error']=str(error); ui.capture('failure'); raise
    finally:
        ui.adb('shell','svc','wifi','enable',check=False); ui.adb('shell','svc','data','enable',check=False); ui.adb('shell','settings','put','system','font_scale','1.0',check=False)
        if other_token:
            status,_=post('/functions/v1/mobile-api',{'path':'/api/mobile/account','method':'DELETE','body':None,'context':{'timeZone':'UTC'}},other_token)
            result['secondAccountDeleted']=status==200
            assert status==200, 'Disposable second account cleanup failed'
        (ui.OUT/'result.json').write_text(json.dumps(result,indent=2))
if __name__=='__main__':main()
