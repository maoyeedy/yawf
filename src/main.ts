/*!
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { GM_getValue } from '$';
import { buildPagePayload } from './page/index';
import { injectPageScript } from './page/injector';
import { initContentUI } from './ui/settings';

const configKey = 'CONFIG';
const messageKey =
  'yawf-' +
  Array(64)
    .fill(0)
    .map(() => (Math.random() * 16).toString(16)[0])
    .join('');

// Build and inject the page-script payload into the main world
const configSnapshot = (function () {
  try {
    const config = GM_getValue(configKey);
    if (typeof config === 'object') return (config as Record<string, unknown>) || {};
    return {};
  } catch {
    return {};
  }
})();

const payload = buildPagePayload(configSnapshot, messageKey);
injectPageScript(payload);

// Initialize the content-script side (settings UI, FAB, broker)
initContentUI(messageKey);
