/**
 * pendli — Comprehensive Browser Test Runner
 * Auto-runs when URL contains #autotest
 *
 * Tests every core user flow:
 * 1. Setup page form elements
 * 2. Demo data loading
 * 3. Manual appointment entry
 * 4. Appointment removal
 * 5. Route calculation
 * 6. Result page timeline chronological order
 * 7. Result page action buttons
 * 8. Back navigation
 */
(function () {
  'use strict';

  if (!location.hash.includes('autotest')) return;

  // ---------------------------------------------------------------------------
  // Counters & helpers
  // ---------------------------------------------------------------------------
  var ok = 0;
  var fail = 0;
  var warn = 0;
  var stepNum = 0;
  var currentStep = '';

  function log(msg) {
    console.log('[TEST] ' + msg);
    logLines.push(msg);
  }

  function logOk(msg) {
    ok++;
    var m = 'OK   — ' + msg;
    console.log('[TEST] ' + m);
    logLines.push(m);
  }

  function logFail(msg) {
    fail++;
    var m = 'FAIL — ' + msg;
    console.error('[TEST] ' + m);
    logLines.push(m);
  }

  function logWarn(msg) {
    warn++;
    var m = 'WARN — ' + msg;
    console.warn('[TEST] ' + m);
    logLines.push(m);
  }

  function step(name) {
    stepNum++;
    currentStep = 'Step ' + stepNum + ': ' + name;
    document.title = 'TEST ' + stepNum + ': ' + name;
    log('');
    log('===== ' + currentStep + ' =====');
  }

  var logLines = [];

  function summary() {
    log('');
    log('=========================================');
    log('  TEST SUMMARY');
    log('  OK:   ' + ok);
    log('  FAIL: ' + fail);
    log('  WARN: ' + warn);
    log('  TOTAL: ' + (ok + fail + warn));
    log('=========================================');
    document.title = 'TEST DONE — OK:' + ok + ' FAIL:' + fail + ' WARN:' + warn;

    // Show results on page
    var root = document.getElementById('root');
    if (root) {
      var div = document.createElement('div');
      div.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#111;color:#eee;padding:20px;overflow:auto;z-index:99999;font-family:monospace;font-size:13px;white-space:pre-wrap';
      div.innerHTML = '<h2 style="color:' + (fail > 0 ? '#f44' : '#4f4') + '">TEST DONE — OK:' + ok + ' FAIL:' + fail + ' WARN:' + warn + '</h2>\n' + logLines.map(function(l) {
        var color = '#eee';
        if (l.indexOf('OK') === 0 || l.indexOf('[TEST] OK') !== -1) color = '#4f4';
        if (l.indexOf('FAIL') !== -1) color = '#f44';
        if (l.indexOf('WARN') !== -1) color = '#fa4';
        if (l.indexOf('=====') !== -1) color = '#8af';
        return '<span style="color:' + color + '">' + l.replace(/</g,'&lt;') + '</span>';
      }).join('\n');
      root.innerHTML = '';
      root.appendChild(div);
    }
  }

  /** querySelector shorthand */
  function $(sel) {
    return document.querySelector(sel);
  }

  /** querySelectorAll shorthand */
  function $$(sel) {
    return Array.from(document.querySelectorAll(sel));
  }

  /** Find element(s) by text content */
  function findByText(tag, text, exact) {
    var els = $$(tag);
    for (var i = 0; i < els.length; i++) {
      var t = els[i].textContent || '';
      if (exact ? t.trim() === text : t.indexOf(text) !== -1) {
        return els[i];
      }
    }
    return null;
  }

  /** Find a button by its text content */
  function findButton(text, exact) {
    return findByText('button', text, exact);
  }

  /**
   * Set a React-controlled input value using the native setter + input event.
   * This works because React attaches its own onChange via a synthetic event
   * and the native setter triggers the internal React machinery.
   */
  function setInputValue(input, value) {
    var nativeSetter = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(input),
      'value'
    );
    if (nativeSetter && nativeSetter.set) {
      nativeSetter.set.call(input, value);
    } else {
      input.value = value;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /** Wait until a condition is met, polling every intervalMs, up to timeoutMs */
  function waitFor(conditionFn, callback, timeoutMs, intervalMs) {
    timeoutMs = timeoutMs || 10000;
    intervalMs = intervalMs || 200;
    var elapsed = 0;
    var timer = setInterval(function () {
      elapsed += intervalMs;
      if (conditionFn()) {
        clearInterval(timer);
        callback(true);
      } else if (elapsed >= timeoutMs) {
        clearInterval(timer);
        callback(false);
      }
    }, intervalMs);
  }

  /**
   * Parse a HH:MM string into minutes since midnight for comparison.
   * Returns NaN if unparseable.
   */
  function timeToMinutes(str) {
    var parts = str.split(':');
    if (parts.length !== 2) return NaN;
    var h = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return NaN;
    return h * 60 + m;
  }

  // ---------------------------------------------------------------------------
  // Boot — wait for React to render the app
  // ---------------------------------------------------------------------------
  log('pendli test runner loaded. Waiting for app to mount...');

  waitFor(
    function () {
      // The setup page renders an h2 with "Einrichtung"
      return !!findByText('h2', 'Einrichtung');
    },
    function (found) {
      if (!found) {
        logFail('App did not mount within 10 seconds');
        summary();
        return;
      }
      logOk('App mounted');
      runStep1_SetupPage();
    },
    10000,
    300
  );

  // ---------------------------------------------------------------------------
  // STEP 1: Setup Page — Check form elements exist
  // ---------------------------------------------------------------------------
  function runStep1_SetupPage() {
    step('SETUP PAGE — Verify form elements');

    // 1a. Two address inputs (LocationSearch renders <input type="text">)
    var textInputs = $$('input[type="text"]');
    var addressInputs = textInputs.filter(function (inp) {
      var ph = (inp.getAttribute('placeholder') || '').toLowerCase();
      return ph.indexOf('z.b.') !== -1 || ph.indexOf('zürich') !== -1 || ph.indexOf('altstetten') !== -1 || ph.indexOf('eth') !== -1;
    });
    if (addressInputs.length >= 2) {
      logOk('Found 2 address inputs');
    } else {
      // Fallback: look for all text inputs with placeholder containing location hints
      var allTextInputs = $$('input[type="text"]');
      if (allTextInputs.length >= 2) {
        logOk('Found at least 2 text inputs (address fields)');
      } else {
        logFail('Expected 2 address inputs, found ' + allTextInputs.length);
      }
    }

    // 1b. 7 day buttons (Mo Di Mi Do Fr Sa So)
    var dayLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    var dayButtons = [];
    for (var d = 0; d < dayLabels.length; d++) {
      var btn = findButton(dayLabels[d], true);
      if (btn) dayButtons.push(btn);
    }
    if (dayButtons.length === 7) {
      logOk('Found all 7 day buttons: ' + dayLabels.join(', '));
    } else {
      logFail('Expected 7 day buttons, found ' + dayButtons.length);
    }

    // 1c. 2 time inputs (Arbeitsbeginn / Arbeitsende) — type="text" with inputMode="numeric"
    var timeInputs = $$('input[inputmode="numeric"]');
    if (timeInputs.length >= 2) {
      logOk('Found 2 time inputs (Arbeitsbeginn/Arbeitsende)');
    } else {
      logFail('Expected 2 time inputs, found ' + timeInputs.length);
    }

    // 1d. Buffer slider (range input)
    var rangeInput = $('input[type="range"]');
    if (rangeInput) {
      logOk('Found buffer slider (range input), value=' + rangeInput.value);
    } else {
      logFail('Buffer slider (range input) not found');
    }

    // 1e. "Weiter" button
    var weiterBtn = findButton('Weiter');
    if (weiterBtn) {
      logOk('Found "Weiter" button');
      // 1f. Weiter should be disabled when no addresses are selected
      if (weiterBtn.disabled) {
        logOk('"Weiter" is disabled when no addresses selected');
      } else {
        logFail('"Weiter" should be disabled when no addresses selected');
      }
    } else {
      logFail('"Weiter" button not found');
    }

    // 1g. "Demo laden" button (translated: "Terme laden" = "Demo laden" in code)
    var demoBtn = findButton('Demo laden');
    if (demoBtn) {
      logOk('Found "Demo laden" button');
    } else {
      logFail('"Demo laden" button not found');
    }

    // Proceed to Step 2
    setTimeout(runStep2_DemoData, 500);
  }

  // ---------------------------------------------------------------------------
  // STEP 2: Click "Demo laden" and verify appointments
  // ---------------------------------------------------------------------------
  function runStep2_DemoData() {
    step('DEMO DATA — Load demo appointments');

    var demoBtn = findButton('Demo laden');
    if (!demoBtn) {
      logFail('Cannot proceed — "Demo laden" button not found');
      summary();
      return;
    }

    demoBtn.click();
    log('Clicked "Demo laden"');

    // Wait for the import page to appear
    waitFor(
      function () {
        return !!findByText('h2', 'Termine importieren');
      },
      function (found) {
        if (!found) {
          logFail('Import page did not appear after clicking Demo laden');
          summary();
          return;
        }
        logOk('Navigated to import page');

        // 2a. Verify 5 appointments appear
        // CalendarPreview renders appointment cards with class containing
        // "bg-white" inside a space-y-2 container. Each card has time + title + location.
        // The header says "X Termine erkannt"
        var headerEl = findByText('h3', 'Termine erkannt');
        if (headerEl) {
          var countMatch = headerEl.textContent.match(/^(\d+)/);
          var count = countMatch ? parseInt(countMatch[1], 10) : 0;
          if (count === 5) {
            logOk('5 appointments loaded from demo data');
          } else {
            logFail('Expected 5 appointments, header says ' + count);
          }
        } else {
          logFail('"X Termine erkannt" header not found');
        }

        // 2b. Verify specific titles exist
        var expectedTitles = [
          'Team Standup',
          'Kundentermin',
          'Zahnarzt',
          'Fussball-Training',
          'Kino mit Freunden',
        ];
        var expectedTimes = ['09:00', '11:30', '14:00', '17:30', '20:00'];

        for (var i = 0; i < expectedTitles.length; i++) {
          var titleEl = findByText('p', expectedTitles[i]);
          if (titleEl) {
            logOk('Found appointment: "' + expectedTitles[i] + '"');
          } else {
            logFail('Appointment "' + expectedTitles[i] + '" not found');
          }
        }

        // 2c. Check times are present
        for (var j = 0; j < expectedTimes.length; j++) {
          var timeEl = findByText('span', expectedTimes[j]);
          if (timeEl) {
            logOk('Found time: ' + expectedTimes[j]);
          } else {
            logWarn('Time ' + expectedTimes[j] + ' not found in DOM');
          }
        }

        // Proceed to Step 3
        setTimeout(runStep3_ManualAdd, 500);
      },
      5000,
      200
    );
  }

  // ---------------------------------------------------------------------------
  // STEP 3: Manual appointment entry
  // ---------------------------------------------------------------------------
  function runStep3_ManualAdd() {
    step('MANUAL ADD — Add appointment manually');

    // 3a. Find and click the "+ Termin manuell hinzufügen" button
    var addBtn = findButton('Termin manuell');
    if (!addBtn) {
      addBtn = findButton('manuell hinzufügen');
    }
    if (!addBtn) {
      logFail('"+ Termin manuell hinzufügen" button not found');
      setTimeout(runStep4_RemoveAppointment, 500);
      return;
    }

    addBtn.click();
    log('Clicked manual add button');

    // Wait for the form to appear (it has a <form> tag)
    waitFor(
      function () {
        return !!$('form');
      },
      function (found) {
        if (!found) {
          logFail('Manual entry form did not appear');
          setTimeout(runStep4_RemoveAppointment, 500);
          return;
        }
        logOk('Manual entry form opened');

        // 3b. Verify 5 inputs in the form
        var formInputs = $$('form input');
        if (formInputs.length >= 5) {
          logOk('Form has ' + formInputs.length + ' inputs (expected >= 5)');
        } else {
          logFail('Form has ' + formInputs.length + ' inputs, expected >= 5');
        }

        // 3c. Fill in the form
        // Inputs: title (text), date (date), startTime (text/numeric), endTime (text/numeric), location (text)
        var titleInput = $('form input[type="text"][placeholder="Titel"]');
        var dateInput = $('form input[type="date"]');
        var locationInput = $('form input[placeholder="Ort / Adresse"]');

        // Time inputs inside the form with inputMode=numeric
        var formTimeInputs = $$('form input[inputmode="numeric"]');
        var startTimeInput = formTimeInputs[0] || null;
        var endTimeInput = formTimeInputs[1] || null;

        // Get today's date as YYYY-MM-DD
        var today = new Date();
        var yyyy = today.getFullYear();
        var mm = String(today.getMonth() + 1).padStart(2, '0');
        var dd = String(today.getDate()).padStart(2, '0');
        var dateStr = yyyy + '-' + mm + '-' + dd;

        if (titleInput) {
          setInputValue(titleInput, 'Test Termin Autotest');
          logOk('Set title: "Test Termin Autotest"');
        } else {
          logFail('Title input not found');
        }

        if (dateInput) {
          setInputValue(dateInput, dateStr);
          logOk('Set date: ' + dateStr);
        } else {
          logFail('Date input not found');
        }

        if (startTimeInput) {
          setInputValue(startTimeInput, '16:00');
          logOk('Set start time: 16:00');
        } else {
          logFail('Start time input not found');
        }

        if (endTimeInput) {
          setInputValue(endTimeInput, '16:30');
          logOk('Set end time: 16:30');
        } else {
          logFail('End time input not found');
        }

        if (locationInput) {
          setInputValue(locationInput, 'Zürich HB');
          logOk('Set location: "Zürich HB"');
        } else {
          logFail('Location input not found');
        }

        // 3d. Submit the form
        setTimeout(function () {
          var submitBtn = $('form button[type="submit"]');
          if (submitBtn) {
            submitBtn.click();
            log('Clicked form submit button');
          } else {
            // Try finding the "Hinzufügen" button
            var hinzuBtn = findButton('Hinzufügen');
            if (hinzuBtn) {
              hinzuBtn.click();
              log('Clicked "Hinzufügen" button');
            } else {
              logFail('Submit button not found');
            }
          }

          // 3e. Wait for appointment count to increase
          setTimeout(function () {
            var headerEl = findByText('h3', 'Termine erkannt');
            if (headerEl) {
              var countMatch = headerEl.textContent.match(/^(\d+)/);
              var count = countMatch ? parseInt(countMatch[1], 10) : 0;
              if (count === 6) {
                logOk('Appointment count increased to 6 after manual add');
              } else if (count > 5) {
                logOk('Appointment count increased to ' + count + ' after manual add');
              } else {
                logFail('Appointment count did not increase, still ' + count);
              }
            } else {
              logFail('Could not find appointment count header after adding');
            }

            // Verify the new appointment appears
            var newAppt = findByText('p', 'Test Termin Autotest');
            if (newAppt) {
              logOk('New appointment "Test Termin Autotest" appears in list');
            } else {
              logWarn('New appointment text not found in DOM (form may not have submitted)');
            }

            setTimeout(runStep4_RemoveAppointment, 500);
          }, 800);
        }, 300);
      },
      3000,
      200
    );
  }

  // ---------------------------------------------------------------------------
  // STEP 4: Remove an appointment
  // ---------------------------------------------------------------------------
  function runStep4_RemoveAppointment() {
    step('REMOVE APPOINTMENT — Click X to remove');

    // Find current count
    var headerEl = findByText('h3', 'Termine erkannt');
    var beforeCount = 0;
    if (headerEl) {
      var countMatch = headerEl.textContent.match(/^(\d+)/);
      beforeCount = countMatch ? parseInt(countMatch[1], 10) : 0;
      log('Current appointment count: ' + beforeCount);
    }

    // Find remove buttons — they have aria-label="... entfernen"
    var removeButtons = $$('button[aria-label]').filter(function (btn) {
      return (btn.getAttribute('aria-label') || '').indexOf('entfernen') !== -1;
    });

    if (removeButtons.length === 0) {
      logFail('No remove (X) buttons found');
      setTimeout(runStep5_RouteCalculation, 500);
      return;
    }

    log('Found ' + removeButtons.length + ' remove buttons');

    // Click the last one (to remove the Test Termin if it exists, otherwise the last demo one)
    var lastRemoveBtn = removeButtons[removeButtons.length - 1];
    var removedLabel = lastRemoveBtn.getAttribute('aria-label') || 'unknown';
    lastRemoveBtn.click();
    log('Clicked remove button: "' + removedLabel + '"');

    // Wait for count to decrease
    setTimeout(function () {
      var headerEl2 = findByText('h3', 'Termine erkannt');
      var afterCount = 0;
      if (headerEl2) {
        var countMatch2 = headerEl2.textContent.match(/^(\d+)/);
        afterCount = countMatch2 ? parseInt(countMatch2[1], 10) : 0;
      }

      if (afterCount < beforeCount) {
        logOk('Appointment count decreased from ' + beforeCount + ' to ' + afterCount);
      } else {
        logFail('Appointment count did not decrease (before=' + beforeCount + ', after=' + afterCount + ')');
      }

      setTimeout(runStep5_RouteCalculation, 500);
    }, 600);
  }

  // ---------------------------------------------------------------------------
  // STEP 5: Route Calculation
  // ---------------------------------------------------------------------------
  function runStep5_RouteCalculation() {
    step('ROUTE CALCULATION — Click "Route berechnen" and wait');

    var calcBtn = findButton('Route berechnen');
    if (!calcBtn) {
      logFail('"Route berechnen" button not found');
      summary();
      return;
    }

    if (calcBtn.disabled) {
      logFail('"Route berechnen" button is disabled (no appointments?)');
      summary();
      return;
    }

    calcBtn.click();
    log('Clicked "Route berechnen"');

    // Wait for the calculation to complete — result page has the DayTimeline
    // which renders the formatted date header and "Start: Zuhause"
    waitFor(
      function () {
        return !!findByText('p', 'Start: Zuhause') || !!findByText('p', 'Kein Tagesplan');
      },
      function (found) {
        if (!found) {
          logFail('Route calculation did not complete within 30s');
          // Check if still on plan step
          var calcText = findByText('h2', 'Route wird berechnet');
          if (calcText) {
            logWarn('Still showing "Route wird berechnet..." — API may be slow');
          }
          summary();
          return;
        }

        // Check if we got a plan or an error
        if (findByText('p', 'Kein Tagesplan')) {
          logFail('Got "Kein Tagesplan vorhanden" — calculation produced no results');
          summary();
          return;
        }

        logOk('Route calculation complete — result page visible');
        setTimeout(runStep6_TimelineOrder, 800);
      },
      30000,
      500
    );
  }

  // ---------------------------------------------------------------------------
  // STEP 6: Result Page — Timeline Chronological Order
  // ---------------------------------------------------------------------------
  function runStep6_TimelineOrder() {
    step('TIMELINE ORDER — Verify chronological ordering');

    // The timeline contains:
    //  - "Start: Zuhause" (top)
    //  - RouteSegmentCards with departure/arrival times and from/to names
    //  - AppointmentCards with start/end times and titles
    //  - "Ende: Zuhause" (bottom)

    // Collect all timeline items by looking at the .pl-10 containers
    var timelineContainer = $('div.relative');
    if (!timelineContainer) {
      logFail('Timeline container not found');
      setTimeout(runStep7_ResultButtons, 500);
      return;
    }

    // Strategy: extract all font-mono time elements that show HH:MM format
    // Appointments have: <span class="font-mono text-sm font-bold text-sbb-red">HH:MM</span>
    // Segments have: <span class="font-mono text-sm font-bold text-anthracite ...">HH:MM</span>
    //
    // We walk through the DOM in order and collect times.

    var allPl10 = $$('.pl-10');
    var allTimes = [];
    var itemLog = [];

    for (var i = 0; i < allPl10.length; i++) {
      var container = allPl10[i];

      // Get the first bold mono time (departure or start time)
      var boldTimeEls = container.querySelectorAll('.font-mono.text-sm.font-bold');
      if (boldTimeEls.length === 0) continue;

      var firstTime = (boldTimeEls[0].textContent || '').trim();
      var secondTimeEls = container.querySelectorAll('.font-mono.text-sm:not(.font-bold)');
      var secondTime = secondTimeEls.length > 0 ? (secondTimeEls[0].textContent || '').trim() : '';

      // Determine if this is an appointment or segment
      var isAppointment = !!container.querySelector('.bg-sbb-red.rounded-full'); // appointment dot
      var isSegment = !!container.querySelector('button.w-full.text-left'); // segment is a <button>

      if (isAppointment) {
        // Get title from <p class="text-sm font-semibold ...">
        var titleEl = container.querySelector('p.text-sm.font-semibold');
        var title = titleEl ? titleEl.textContent.trim() : '(unknown)';
        var locEl = container.querySelector('p.text-xs');
        var loc = locEl ? locEl.textContent.trim() : '';

        log('  APPOINTMENT: ' + firstTime + ' - ' + secondTime + ' | ' + title + ' @ ' + loc);
        itemLog.push({ type: 'appointment', time: firstTime, title: title });
        allTimes.push(firstTime);
      } else if (isSegment) {
        // Get from/to names
        var nameEls = container.querySelectorAll('.text-xs.truncate');
        var fromName = nameEls.length > 0 ? nameEls[0].textContent.trim() : '?';
        var toName = nameEls.length > 1 ? nameEls[1].textContent.trim() : '?';

        log('  SEGMENT:     ' + firstTime + ' - ' + secondTime + ' | ' + fromName + ' -> ' + toName);
        itemLog.push({ type: 'segment', time: firstTime, from: fromName, to: toName });
        allTimes.push(firstTime);
      }
    }

    if (allTimes.length === 0) {
      logFail('No timeline items with times found');
      setTimeout(runStep7_ResultButtons, 500);
      return;
    }

    log('Extracted ' + allTimes.length + ' timeline items');

    // Verify chronological order
    var inOrder = true;
    var prevMinutes = -1;
    for (var k = 0; k < allTimes.length; k++) {
      var mins = timeToMinutes(allTimes[k]);
      if (isNaN(mins)) {
        logWarn('Could not parse time: "' + allTimes[k] + '"');
        continue;
      }
      if (mins < prevMinutes) {
        inOrder = false;
        logFail(
          'Chronological order broken: ' +
            allTimes[k] +
            ' (' + mins + ' min) comes after ' +
            allTimes[k - 1] +
            ' (' + prevMinutes + ' min)'
        );
      }
      prevMinutes = mins;
    }

    if (inOrder) {
      logOk('All ' + allTimes.length + ' timeline items are in CHRONOLOGICAL ORDER');
    }

    // Log summary
    for (var m = 0; m < itemLog.length; m++) {
      var entry = itemLog[m];
      if (entry.type === 'appointment') {
        log('  [' + entry.time + '] APT: ' + entry.title);
      } else {
        log('  [' + entry.time + '] SEG: ' + entry.from + ' -> ' + entry.to);
      }
    }

    setTimeout(runStep7_ResultButtons, 500);
  }

  // ---------------------------------------------------------------------------
  // STEP 7: Result Page — Action Buttons
  // ---------------------------------------------------------------------------
  function runStep7_ResultButtons() {
    step('RESULT BUTTONS — Verify action buttons exist');

    // "In Kalender" button
    var calBtn = findButton('In Kalender');
    if (calBtn) {
      logOk('Found "In Kalender" button');
    } else {
      logFail('"In Kalender" button not found');
    }

    // "Teilen" button
    var shareBtn = findButton('Teilen');
    if (shareBtn) {
      logOk('Found "Teilen" button');
    } else {
      logFail('"Teilen" button not found');
    }

    // "Neuen Tag planen" button
    var newDayBtn = findButton('Neuen Tag planen');
    if (newDayBtn) {
      logOk('Found "Neuen Tag planen" button');
    } else {
      logFail('"Neuen Tag planen" button not found');
    }

    setTimeout(runStep8_BackNavigation, 500);
  }

  // ---------------------------------------------------------------------------
  // STEP 8: Back Navigation
  // ---------------------------------------------------------------------------
  function runStep8_BackNavigation() {
    step('BACK NAVIGATION — Click "Neuen Tag planen"');

    var newDayBtn = findButton('Neuen Tag planen');
    if (!newDayBtn) {
      logFail('"Neuen Tag planen" button not found — cannot test back nav');
      summary();
      return;
    }

    newDayBtn.click();
    log('Clicked "Neuen Tag planen"');

    // Wait for import page to appear (it clears appointments and goes to 'import' step)
    waitFor(
      function () {
        return !!findByText('h2', 'Termine importieren');
      },
      function (found) {
        if (found) {
          logOk('Successfully navigated back to import page');
        } else {
          logFail('Did not navigate back to import page');
        }

        // Verify appointments were cleared (the CalendarPreview should not render)
        var headerEl = findByText('h3', 'Termine erkannt');
        if (!headerEl) {
          logOk('Appointments cleared after "Neuen Tag planen"');
        } else {
          logWarn('Appointment header still visible: "' + headerEl.textContent + '"');
        }

        summary();
      },
      5000,
      200
    );
  }
})();
