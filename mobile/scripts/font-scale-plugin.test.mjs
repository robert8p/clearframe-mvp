import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';

const pluginSource = fs.readFileSync(new URL('../plugins/withAndroidFontScaleLayout.js', import.meta.url), 'utf8');
const template = execFileSync('tar', ['-xOf', new URL('../node_modules/expo/template.tgz', import.meta.url).pathname, 'package/android/app/src/main/java/com/helloworld/MainApplication.kt'], { encoding: 'utf8' });
function apply(source, { rn = '0.81.5', expo = '54.0.37', language = 'kt', newArchEnabled = true } = {}) {
  const module = { exports: {} };
  const imports = {
    'expo/config-plugins': { withMainApplication: (config, callback) => callback(config) },
    'react-native/package.json': { version: rn },
    'expo/package.json': { version: expo },
  };
  new Function('require', 'module', 'exports', pluginSource)(name => {
    assert(name in imports, `Unexpected import ${name}`); return imports[name];
  }, module, module.exports);
  return module.exports({ newArchEnabled, modResults: { language, contents: source } }).modResults.contents;
}

test('Actual Expo 54 Android template receives exactly one override before lifecycle dispatch; applying twice is identical', () => {
  const patched = apply(template);
  assert.equal(apply(patched), patched);
  assert.equal(patched.split('dangerouslyForceOverride(').length - 1, 1);
  const position = patched.indexOf('dangerouslyForceOverride(');
  assert(position > patched.indexOf('loadReactNative(this)'));
  assert(position < patched.indexOf('ApplicationLifecycleDispatcher.onApplicationCreate(this)'));
  // Removing the injected range recovers every line of the original template.
  const unpatched = patched.replace(/    \/\/ @generated begin cogni-android-font-scale-layout[\s\S]*?    \/\/ @generated end cogni-android-font-scale-layout\n/, '');
  assert.equal(unpatched, template);
});

test('Workaround fails closed for different native/Expo versions and unsupported architecture/template', () => {
  for (const options of [{ rn: '0.81.6' }, { rn: '0.82.0' }, { expo: '55.0.0' }, { language: 'java' }, { newArchEnabled: false }]) {
    assert.throws(() => apply(template, options));
  }
});

test('Startup ordering changes, duplicate anchors and another provider override require explicit review', () => {
  for (const changed of [
    template.replace('loadReactNative(this)', 'loadReactNative(this)\n    startReactSurface()'),
    template.replace('loadReactNative(this)', 'loadReactNative(this)\n    loadReactNative(this)'),
    template.replace('ApplicationLifecycleDispatcher.onApplicationCreate(this)', ''),
    template.replace('super.onCreate()', 'super.onCreate()\n    ReactNativeFeatureFlags.override(otherProvider)'),
  ]) assert.throws(() => apply(changed));
});

test('A changed managed block is rejected instead of silently overwriting an existing native override', () => {
  const patched = apply(template);
  assert.throws(() => apply(patched.replace('fabricEnabled = true', 'fabricEnabled = false')));
  assert.throws(() => apply(patched.replace('// @generated end cogni-android-font-scale-layout', '')));
});

test('Native injection preserves stable flags by delegation and refuses a previously consumed font-scale flag', () => {
  const patched = apply(template);
  assert(patched.includes('ReactNativeFeatureFlagsProvider by'));
  assert(patched.includes('ReactNativeFeatureFlagsOverrides_RNOSS_Stable_Android('));
  assert.equal((patched.match(/override fun /g) ?? []).length, (template.match(/override fun /g) ?? []).length + 1);
  assert(patched.includes('releaseLevel == com.facebook.react.common.ReleaseLevel.STABLE'));
  assert(patched.includes('check(BuildConfig.IS_NEW_ARCHITECTURE_ENABLED)'));
  assert(patched.includes('check(cogniPreviouslyAccessedFlags?.contains("enableFontScaleChangesUpdatingLayout") != true)'));
});
