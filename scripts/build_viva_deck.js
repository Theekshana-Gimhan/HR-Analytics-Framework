// Assemble the COM4901 final viva presentation.
//
// WHY THIS EXISTS
// ---------------
// Same reason as scripts/build_dissertation.py: slides drafted by hand in
// PowerPoint are unreviewable -- no diffs, no version control, and every
// formatting decision has to be re-applied by hand each pass. The deck is
// generated instead, so a changed figure is a one-line edit and a rebuild.
// Every number on these slides is sourced from Chapter 5; when a result
// changes there, change it here too.
//
// DESIGN
// ------
// The palette is semantic, not decorative: terracotta always marks the
// transfer arm (the thing that failed), sage always marks the local model
// (the thing that worked). Once slide 9 establishes that pairing, the later
// charts read without needing a legend.
//
// Charts are native PowerPoint chart objects rather than images, so the
// numbers stay editable in PowerPoint after the build.
//
// Run:   npm install pptxgenjs && node scripts/build_viva_deck.js
// Needs: pptxgenjs (not vendored -- there is no package.json at the repo root)

const pptx = require('pptxgenjs');
const path = require('path');

const REPO = path.join(__dirname, '..');
const OUT = path.join(REPO, 'created_docs', 'Final_Viva_Presentation_COM4901_Theekshana_Gimhan.pptx');

const pres = new pptx();
pres.layout = 'LAYOUT_WIDE';               // 13.333 x 7.5 -- set BEFORE any slide
pres.author = 'Theekshana Gimhan';
pres.title = 'A Cost-Effective Predictive HR Analytics Framework for Sri Lankan SMEs';

const W = 13.333, H = 7.5, M = 0.7, CW = W - 2 * M;

const INK    = '2E241E';   // dark clay -- title/section grounds
const TERRA  = 'B85042';   // transfer arm / negative results
const SAGE   = '5F7F6C';   // local model / positive results
const SAGELT = 'A7BEAE';
const SAND   = 'EFEFE2';   // card fill on white
const SANDD  = 'E0E1CE';   // second-level card fill
const BODY   = '3A322C';
const MUTED  = '7A7167';
const WHITE  = 'FFFFFF';

const HEAD = 'Cambria';    // safe-list serif
const TEXT = 'Calibri';    // safe-list sans

let n = 0;

function newSlide(dark) {
  const s = pres.addSlide();
  s.background = { color: dark ? INK : WHITE };
  n += 1;
  if (!dark) {
    s.addText(String(n), {
      x: W - 1.0, y: H - 0.52, w: 0.4, h: 0.28, margin: 0,
      fontSize: 10, color: MUTED, fontFace: TEXT, align: 'right',
    });
  }
  return s;
}

function title(s, text, sub) {
  s.addText(text, {
    x: M, y: 0.42, w: CW, h: 0.8, margin: 0, valign: 'middle',
    fontSize: 30, bold: true, color: INK, fontFace: HEAD,
  });
  if (sub) {
    s.addText(sub, {
      x: M, y: 1.22, w: CW, h: 0.38, margin: 0, valign: 'top',
      fontSize: 14, color: MUTED, fontFace: TEXT, italic: true,
    });
  }
}

// The motif: a filled circle carrying a number or short label. Repeated on
// every content slide that lists things, and nowhere else.
function badge(s, x, y, size, label, fill, txt) {
  s.addShape(pres.ShapeType.ellipse, {
    x, y, w: size, h: size, fill: { color: fill }, line: { color: fill },
  });
  s.addText(label, {
    x, y, w: size, h: size, margin: 0, align: 'center', valign: 'middle',
    fontSize: Math.round(size * 26), bold: true, color: txt || WHITE, fontFace: TEXT,
  });
}

function card(s, x, y, w, h, fill) {
  s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.06,
    fill: { color: fill }, line: { color: fill },
    shadow: { type: 'outer', color: '000000', blur: 6, offset: 1, angle: 90, opacity: 0.07 },
  });
}

// Big number + label. The deck's main way of showing a result.
function stat(s, x, y, w, value, label, color, valueSize) {
  s.addText(value, {
    x, y, w, h: 0.85, margin: 0, valign: 'bottom',
    fontSize: valueSize || 44, bold: true, color, fontFace: HEAD,
  });
  s.addText(label, {
    x, y: y + 0.88, w, h: 0.62, margin: 0, valign: 'top',
    fontSize: 12, color: MUTED, fontFace: TEXT,
  });
}

function bullets(s, x, y, w, h, items, size) {
  s.addText(
    items.map((t, i) => ({
      text: t,
      options: { bullet: true, breakLine: i !== items.length - 1 },
    })),
    {
      x, y, w, h, margin: 0, valign: 'top',
      fontSize: size || 14, color: BODY, fontFace: TEXT,
      lineSpacingMultiple: 1.1, paraSpaceAfter: 8,
    }
  );
}

const chartFrame = () => ({
  showLegend: false,
  showTitle: false,
  catAxisLabelColor: MUTED, catAxisLabelFontSize: 11, catAxisLabelFontFace: TEXT,
  valAxisLabelColor: MUTED, valAxisLabelFontSize: 10, valAxisLabelFontFace: TEXT,
  catGridLine: { style: 'none' },
  valGridLine: { color: 'E8E4DE', size: 1 },
  showValue: true, dataLabelPosition: 'outEnd',
  dataLabelColor: BODY, dataLabelFontSize: 11, dataLabelFontFace: TEXT,
  dataLabelFormatCode: '0.000',
});

// ---------------------------------------------------------------- 1. Title
{
  const s = newSlide(true);
  s.addShape(pres.ShapeType.ellipse, {
    x: 9.9, y: 0.9, w: 4.4, h: 4.4, fill: { color: TERRA, transparency: 72 }, line: { color: TERRA, transparency: 72 },
  });
  s.addShape(pres.ShapeType.ellipse, {
    x: 10.9, y: 2.5, w: 3.2, h: 3.2, fill: { color: SAGE, transparency: 60 }, line: { color: SAGE, transparency: 60 },
  });
  s.addText('A Cost-Effective Predictive HR Analytics Framework for Sri Lankan SMEs', {
    x: M, y: 1.75, w: 8.9, h: 2.0, margin: 0, valign: 'middle',
    fontSize: 33, bold: true, color: WHITE, fontFace: HEAD, lineSpacingMultiple: 1.05,
  });
  s.addText('Using cloud-native serverless AI', {
    x: M, y: 3.72, w: 8.9, h: 0.42, margin: 0,
    fontSize: 17, color: SAGELT, fontFace: TEXT, italic: true,
  });
  s.addText('Final Presentation and Viva  |  COM 4901', {
    x: M, y: 4.55, w: 8.9, h: 0.3, margin: 0,
    fontSize: 12, color: SANDD, fontFace: TEXT, charSpacing: 1.5,
  });
  s.addText(
    [
      { text: 'Theekshana Gimhan', options: { bold: true, breakLine: true, fontSize: 16, color: WHITE } },
      { text: 'Student ID 15002', options: { breakLine: true, fontSize: 12, color: SANDD } },
      { text: 'Supervisor: Ms. Thanuja Irugalbandara', options: { breakLine: true, fontSize: 12, color: SANDD } },
      { text: 'BSc (Hons) Management Information Systems  |  KIU University  |  September 2026', options: { fontSize: 11, color: MUTED } },
    ],
    { x: M, y: 5.15, w: 8.9, h: 1.6, margin: 0, fontFace: TEXT, lineSpacingMultiple: 1.25 }
  );
  s.addNotes('Good morning. This project asked whether a Sri Lankan SME can run predictive HR analytics on a serverless budget, and whether attrition models built elsewhere transfer here. The headline answer to the second question is no, and that negative result is the contribution.');
}

// ------------------------------------------------------------- 2. Problem
{
  const s = newSlide();
  title(s, 'The problem', 'Firms with the turnover cost of a large employer and none of the analytics capacity');
  bullets(s, M, 2.0, 6.6, 3.4, [
    'Commercial HR analytics is licensed per seat at enterprise scale. The fixed cost does not shrink with the firm.',
    'AutoML platforms assume continuous, high-volume training data. A 30-person SME generates neither the volume nor the turnover events.',
    'No published attrition model is fitted to Sri Lankan data, so practitioners are implicitly told to borrow one built elsewhere.',
  ], 15);
  s.addText('That last assumption is what this project set out to test.', {
    x: M, y: 4.45, w: 6.6, h: 0.5, margin: 0,
    fontSize: 15, bold: true, color: TERRA, fontFace: TEXT, italic: true,
  });

  const cx = 7.9, cw = 4.73;
  const rows = [
    ['20-50', 'Employees in the target firm size'],
    ['LKR 10,000', 'Monthly operational cost ceiling'],
    ['230', 'Real Sri Lankan records available anywhere'],
  ];
  rows.forEach(([v, l], i) => {
    const y = 2.0 + i * 1.34;
    card(s, cx, y, cw, 1.14, SAND);
    s.addText(v, {
      x: cx + 0.32, y: y + 0.08, w: cw - 0.6, h: 0.55, margin: 0, valign: 'middle',
      fontSize: 26, bold: true, color: INK, fontFace: HEAD,
    });
    s.addText(l, {
      x: cx + 0.32, y: y + 0.63, w: cw - 0.6, h: 0.4, margin: 0, valign: 'top',
      fontSize: 11.5, color: MUTED, fontFace: TEXT,
    });
  });
  s.addNotes('The cost ceiling is not arbitrary - it is roughly what an SME of this size can absorb without board approval. The 230 figure matters most: that is the entire real Sri Lankan evidence base, and it is why borrowing looked attractive.');
}

// ------------------------------------------------------------ 3. The gap
{
  const s = newSlide();
  title(s, 'The gap in the literature', 'Transfer is assumed by one body of work and doubted by another. Almost nobody tests it.');

  card(s, M, 2.0, 5.75, 2.25, SAND);
  badge(s, M + 0.32, 2.28, 0.5, 'A', TERRA);
  s.addText('What the ML literature assumes', {
    x: M + 0.98, y: 2.3, w: 4.5, h: 0.42, margin: 0, valign: 'middle',
    fontSize: 15, bold: true, color: INK, fontFace: TEXT,
  });
  s.addText('Attrition studies train and validate on a single public dataset, most often IBM\u2019s synthetic HR set, then name generalisation to other contexts as future work.', {
    x: M + 0.32, y: 2.95, w: 5.1, h: 1.4, margin: 0, valign: 'top',
    fontSize: 13.5, color: BODY, fontFace: TEXT, lineSpacingMultiple: 1.1,
  });

  card(s, 6.85, 2.0, 5.78, 2.25, SAND);
  badge(s, 7.17, 2.28, 0.5, 'B', SAGE);
  s.addText('What the shift literature predicts', {
    x: 7.83, y: 2.3, w: 4.5, h: 0.42, margin: 0, valign: 'middle',
    fontSize: 15, bold: true, color: INK, fontFace: TEXT,
  });
  s.addText('Dataset-shift theory and cross-cultural research both expect the relationship between predictors and turnover to change across labour markets \u2014 so transfer should degrade.', {
    x: 7.17, y: 2.95, w: 5.14, h: 1.4, margin: 0, valign: 'top',
    fontSize: 13.5, color: BODY, fontFace: TEXT, lineSpacingMultiple: 1.1,
  });

  card(s, M, 4.65, CW, 1.6, INK);
  s.addText('Two literatures disagree, and the disagreement has not been settled empirically for this region.', {
    x: M + 0.5, y: 4.85, w: CW - 1.0, h: 0.42, margin: 0, valign: 'middle',
    fontSize: 15, color: SANDD, fontFace: TEXT,
  });
  s.addText('This project runs the test both of them defer.', {
    x: M + 0.5, y: 5.35, w: CW - 1.0, h: 0.5, margin: 0, valign: 'middle',
    fontSize: 19, bold: true, color: WHITE, fontFace: HEAD,
  });
  s.addNotes('This is the framing that makes a negative result publishable rather than disappointing. Nobody had run the test for Sri Lanka, and the two relevant literatures make opposite predictions about what it would show.');
}

// --------------------------------------------------- 4. Research questions
{
  const s = newSlide();
  title(s, 'Research questions', 'As stated in the interim report; Chapter 1 records how they evolved from the proposal');
  const qs = [
    ['1', 'Which predictors matter for the Sri Lankan SME context, and how far do attrition patterns transfer from international data?', TERRA],
    ['2', 'How far does a serverless architecture reduce operational cost, and can it stay within LKR 10,000 per month?', SAGE],
    ['3', 'Can a hybrid of real international and calibrated synthetic data produce a usable classifier for a low-volume environment?', TERRA],
  ];
  qs.forEach(([num, text, col], i) => {
    const y = 2.1 + i * 1.45;
    card(s, M, y, CW, 1.2, SAND);
    badge(s, M + 0.36, y + 0.3, 0.6, num, col);
    s.addText(text, {
      x: M + 1.2, y: y + 0.14, w: CW - 1.7, h: 0.92, margin: 0, valign: 'middle',
      fontSize: 15, color: BODY, fontFace: TEXT, lineSpacingMultiple: 1.1,
    });
  });
  s.addText('Each is answered in Chapter 6 in a single sentence first, then elaborated. Two of the three answers are negative.', {
    x: M, y: 6.5, w: CW, h: 0.4, margin: 0,
    fontSize: 13, color: MUTED, fontFace: TEXT, italic: true,
  });
  s.addNotes('Flag early that two of three answers are negative, so the examiners are not waiting for a triumph slide that never comes.');
}

// ----------------------------------------------------------- 5. Methodology
{
  const s = newSlide();
  title(s, 'Methodology', 'Design Science Research, six activities mapped to project phases');
  const steps = [
    ['1', 'Problem identification', 'SME cost and data constraints established from the Sri Lankan context'],
    ['2', 'Define objectives', 'Five objectives, O1 to O5; three carry measurable pass criteria'],
    ['3', 'Design & development', 'HR platform, ML pipeline, inference service and Pulse Check'],
    ['4', 'Demonstration', 'Deployed to Cloud Run and exercised end to end on live infrastructure'],
    ['5', 'Evaluation', 'One script per question, each emitting a machine-readable report'],
    ['6', 'Communication', 'This dissertation, the artefacts, and the reported negative results'],
  ];
  steps.forEach(([num, head, sub], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = M + col * 4.09, y = 2.05 + row * 2.25;
    card(s, x, y, 3.79, 1.95, i < 3 ? SAND : SANDD);
    badge(s, x + 0.3, y + 0.26, 0.52, num, i < 3 ? SAGE : INK);
    s.addText(head, {
      x: x + 0.3, y: y + 0.88, w: 3.2, h: 0.35, margin: 0, valign: 'middle',
      fontSize: 14.5, bold: true, color: INK, fontFace: TEXT,
    });
    s.addText(sub, {
      x: x + 0.3, y: y + 1.22, w: 3.2, h: 0.62, margin: 0, valign: 'top',
      fontSize: 11.5, color: MUTED, fontFace: TEXT, lineSpacingMultiple: 1.05,
    });
  });
  s.addNotes('The point to stress is the evaluation activity: every number in Chapter 5 comes from a script written to attack a claim, not to illustrate one.');
}

// ---------------------------------------------------------- 6. Data strategy
{
  const s = newSlide();
  title(s, 'Data strategy', 'Weighted multi-source training, validated on held-out real Sri Lankan data');
  const sets = [
    ['2,820', 'Training master', 'Saudi real 1,191  +  Russian real 1,129  +  calibrated synthetic 500', SAND],
    ['230', 'Sri Lankan validation', '33 positive cases (14.3%). Never used in training, at any stage.', SAND],
    ['1,470', 'IBM benchmark', 'Published comparison only. Never mixed into training or validation.', SAND],
  ];
  sets.forEach(([v, h, sub, fill], i) => {
    const x = M + i * 4.09;
    card(s, x, 2.05, 3.79, 2.35, fill);
    s.addText(v, {
      x: x + 0.32, y: 2.22, w: 3.2, h: 0.7, margin: 0, valign: 'middle',
      fontSize: 32, bold: true, color: i === 1 ? SAGE : INK, fontFace: HEAD,
    });
    s.addText(h, {
      x: x + 0.32, y: 2.94, w: 3.2, h: 0.34, margin: 0, valign: 'middle',
      fontSize: 14, bold: true, color: INK, fontFace: TEXT,
    });
    s.addText(sub, {
      x: x + 0.32, y: 3.32, w: 3.2, h: 0.95, margin: 0, valign: 'top',
      fontSize: 11.5, color: MUTED, fontFace: TEXT, lineSpacingMultiple: 1.05,
    });
  });

  card(s, M, 4.72, CW, 1.72, INK);
  badge(s, M + 0.42, 5.18, 0.56, '!', TERRA);
  s.addText('The outcomes are not identically defined, and the design cannot separate the two effects.', {
    x: M + 1.24, y: 4.96, w: CW - 1.8, h: 0.4, margin: 0, valign: 'middle',
    fontSize: 15, bold: true, color: WHITE, fontFace: TEXT,
  });
  s.addText('The international sources record observed attrition. The Sri Lankan sample records turnover intention. Part of the transfer failure shown next is attributable to this label shift rather than to national context \u2014 which is declared throughout rather than hidden.', {
    x: M + 1.24, y: 5.38, w: CW - 1.8, h: 0.85, margin: 0, valign: 'top',
    fontSize: 12.5, color: SANDD, fontFace: TEXT, lineSpacingMultiple: 1.08,
  });
  s.addNotes('Expect a question here. The honest answer is that label shift and national context are confounded by design, and separating them needs observed attrition data from a Sri Lankan employer - which is the first item of future work.');
}

// ------------------------------------------------------- 7. What was built
{
  const s = newSlide();
  title(s, 'What was built', 'A production HR platform, a serverless inference service, and the capture mechanism that feeds it');

  const boxes = [
    ['Pulse Check', '16-item weekly\nmicro-survey', SAGE],
    ['8 constructs', 'mean of items,\nidentical to training', SAGE],
    ['ML service', 'FastAPI on Cloud Run,\nscales to zero', INK],
    ['Risk + SHAP', 'probability, threshold,\nper-request factors', TERRA],
  ];
  boxes.forEach(([h, sub, col], i) => {
    const x = M + i * 3.16;
    card(s, x, 2.15, 2.72, 1.55, SAND);
    s.addText(h, {
      x: x + 0.2, y: 2.34, w: 2.32, h: 0.4, margin: 0, align: 'center', valign: 'middle',
      fontSize: 15, bold: true, color: col, fontFace: TEXT,
    });
    s.addText(sub, {
      x: x + 0.2, y: 2.78, w: 2.32, h: 0.8, margin: 0, align: 'center', valign: 'top',
      fontSize: 11.5, color: MUTED, fontFace: TEXT, lineSpacingMultiple: 1.05,
    });
    if (i < 3) {
      s.addShape(pres.ShapeType.rightArrow, {
        x: x + 2.79, y: 2.79, w: 0.32, h: 0.28,
        fill: { color: SAGELT }, line: { color: SAGELT },
      });
    }
  });

  card(s, M, 4.15, 6.05, 2.2, SANDD);
  s.addText('Deployed, not prototyped', {
    x: M + 0.32, y: 4.35, w: 5.4, h: 0.36, margin: 0, valign: 'middle',
    fontSize: 15, bold: true, color: INK, fontFace: TEXT,
  });
  bullets(s, M + 0.32, 4.8, 5.4, 1.4, [
    'Inference is IAM-locked and authenticated, never public',
    'Shipped to the product over an HTTP API boundary, not a merge',
    'Employees never see their own risk score, by design',
  ], 12);

  card(s, 7.28, 4.15, 5.35, 2.2, INK);
  s.addText('150', {
    x: 7.6, y: 4.4, w: 2.0, h: 0.72, margin: 0, valign: 'middle',
    fontSize: 40, bold: true, color: SAGELT, fontFace: HEAD,
  });
  s.addText('billable instance-seconds consumed by the inference service across four months.', {
    x: 7.6, y: 5.18, w: 4.7, h: 0.9, margin: 0, valign: 'top',
    fontSize: 13, color: SANDD, fontFace: TEXT, lineSpacingMultiple: 1.1,
  });
  s.addNotes('The 150 seconds figure is the architecture argument in one number: scale-to-zero means the model costs nothing while nobody is asking it anything.');
}

// ----------------------------------------------------------- 8. The system
{
  const s = newSlide();
  title(s, 'The system in use', 'Attrition risk on the employee detail page');
  // Cropped copy: the raw capture carries ~185px of dead browser chrome above
  // the card, which shrinks the card itself to illegibility at slide scale.
  s.addImage({ path: path.join(REPO, 'created_docs/figures/attrition_risk_card_cropped.png'), x: M, y: 1.8, w: 5.7, h: 4.44 });

  const notes = [
    ['Probability against a disclosed threshold', 'The operating point is shown, not hidden \u2014 a manager can see what the model was tuned to do.'],
    ['Per-request SHAP contributions', 'Explanations are computed for this employee, not a global importance chart reused for everyone.'],
    ['The caveat sits at the point of use', 'The card states that the model predicts turnover intention, where the decision is made \u2014 not in a manual.'],
  ];
  notes.forEach(([h, sub], i) => {
    const y = 1.9 + i * 1.55;
    badge(s, 6.5, y + 0.04, 0.44, String(i + 1), SAGE);
    s.addText(h, {
      x: 7.12, y, w: 5.5, h: 0.4, margin: 0, valign: 'middle',
      fontSize: 14.5, bold: true, color: INK, fontFace: TEXT,
    });
    s.addText(sub, {
      x: 7.12, y: y + 0.42, w: 5.5, h: 0.95, margin: 0, valign: 'top',
      fontSize: 12.5, color: MUTED, fontFace: TEXT, lineSpacingMultiple: 1.08,
    });
  });
  s.addNotes('Demo hook. If time is short, skip the live demo and talk over this slide instead.');
}

// ------------------------------------------------ 9. RQ1 headline result
{
  const s = newSlide();
  title(s, 'RQ1 \u2014 attrition patterns do not transfer', 'Both models evaluated against the same held-out Sri Lankan sample (n = 230, 33 positives)');

  card(s, M, 2.0, 2.9, 1.85, SAND);
  stat(s, M + 0.3, 2.1, 2.3, '0.641', 'Transfer model, ROC-AUC\n4 shared features', TERRA, 40);
  card(s, M, 4.05, 2.9, 1.85, SAND);
  stat(s, M + 0.3, 4.15, 2.3, '0.937', 'Local model, ROC-AUC\n8 psychometric constructs', SAGE, 40);

  s.addChart(
    pres.ChartType.bar,
    [
      { name: 'Transfer', labels: ['ROC-AUC', 'PR-AUC'], values: [0.641, 0.285] },
      { name: 'Local', labels: ['ROC-AUC', 'PR-AUC'], values: [0.937, 0.790] },
    ],
    Object.assign(chartFrame(), {
      x: 4.0, y: 1.95, w: 8.63, h: 3.4,
      barDir: 'col', barGapWidthPct: 60,
      chartColors: [TERRA, SAGE],
      valAxisMaxVal: 1.0, valAxisMinVal: 0,
      showLegend: true, legendPos: 'b', legendColor: MUTED, legendFontSize: 11, legendFontFace: TEXT,
    })
  );

  card(s, 4.0, 5.5, 8.63, 1.15, INK);
  s.addText('A model carrying Saudi and Russian labour-market knowledge performs close to chance on Sri Lankan data, while one fitted to Sri Lankan constructs performs strongly.', {
    x: 4.35, y: 5.62, w: 7.95, h: 0.92, margin: 0, valign: 'middle',
    fontSize: 13.5, color: SANDD, fontFace: TEXT, lineSpacingMultiple: 1.1,
  });
  s.addNotes('Be first to say the two figures are not like-for-like: transfer is genuine out-of-sample, local is cross-validated within the same 230 records. They answer different questions. Chapter 5 says this before any reader can raise it.');
}

// ------------------------------------------- 10. Decomposing the transfer
{
  const s = newSlide();
  title(s, 'The transfer result is weaker than 0.64 suggests', 'Decomposing what the four shared features actually contribute');

  s.addChart(
    pres.ChartType.bar,
    // Reversed: a horizontal bar chart renders the first category at the
    // BOTTOM, and the callout to its right is about age + gender, so that bar
    // has to be the top one.
    [{ name: 'ROC-AUC', labels: ['All four features', 'Satisfaction items only', 'Age + gender only'], values: [0.828, 0.825, 0.457] }],
    Object.assign(chartFrame(), {
      x: M, y: 2.0, w: 7.3, h: 2.9,
      barDir: 'bar', barGapWidthPct: 55,
      chartColors: [SAGE, SAGE, TERRA],
      valAxisMaxVal: 1.0, valAxisMinVal: 0,
      dataLabelPosition: 'outEnd',
    })
  );

  card(s, 8.25, 2.0, 4.38, 2.9, SAND);
  s.addText('0.457', {
    x: 8.57, y: 2.2, w: 3.74, h: 0.7, margin: 0, valign: 'middle',
    fontSize: 36, bold: true, color: TERRA, fontFace: HEAD,
  });
  s.addText('Age and gender together score below chance. They carry no transferable signal at all.', {
    x: 8.57, y: 2.95, w: 3.74, h: 1.75, margin: 0, valign: 'top',
    fontSize: 13, color: BODY, fontFace: TEXT, lineSpacingMultiple: 1.12,
  });

  card(s, M, 5.1, CW, 1.5, INK);
  s.addText('Whatever the transfer model achieves comes entirely from satisfaction items \u2014 which, on the Sri Lankan side, are self-reported in the same instrument as the outcome.', {
    x: M + 0.45, y: 5.24, w: CW - 0.9, h: 0.55, margin: 0, valign: 'middle',
    fontSize: 14, color: SANDD, fontFace: TEXT, lineSpacingMultiple: 1.08,
  });
  s.addText('It is partly re-detecting same-source correlation, not transferring knowledge. This weakens my own headline \u2014 and it is reported that way.', {
    x: M + 0.45, y: 5.85, w: CW - 0.9, h: 0.55, margin: 0, valign: 'middle',
    fontSize: 14.5, bold: true, color: WHITE, fontFace: TEXT,
  });
  s.addNotes('This slide exists because the audit found it. The interim report claimed age dominated the transfer model; that turned out to be an artefact of age being stored as four bracket midpoints with 88.7% of records at one value. Say so plainly if asked.');
}

// ----------------------------------------------------------- 11. RQ3
{
  const s = newSlide();
  title(s, 'RQ3 \u2014 can synthetic data substitute for local data?', 'Six conditions, five seeds each, on the transfer arm');

  s.addChart(
    pres.ChartType.bar,
    [{
      name: 'ROC-AUC',
      labels: ['Current recipe\n(2.0 / 0.5)', 'Equal weights', 'Real data only', 'Synthetic only', 'SMOTETOMEK\n+ synthetic', 'SMOTETOMEK\nreal only'],
      values: [0.821, 0.828, 0.788, 0.526, 0.718, 0.655],
    }],
    Object.assign(chartFrame(), {
      x: M, y: 2.05, w: 7.85, h: 3.15,
      barDir: 'col', barGapWidthPct: 45,
      chartColors: [SAGE, SAGE, SAGE, TERRA, SAGE, SAGE],
      varyColors: true,
      valAxisMaxVal: 1.0, valAxisMinVal: 0,
      catAxisLabelFontSize: 9,
      dataLabelFontSize: 10,
    })
  );

  s.addText('No.', {
    x: 8.85, y: 1.95, w: 3.78, h: 0.72, margin: 0, valign: 'middle',
    fontSize: 42, bold: true, color: TERRA, fontFace: HEAD,
  });
  const facts = [
    ['0.526', 'Synthetic data alone \u2014 indistinguishable from chance'],
    ['+0.032', 'Contribution of synthetic augmentation \u2014 inside seed noise'],
    ['\u22120.007', 'Effect of the 2.0 / 0.5 weighting scheme \u2014 immaterial'],
  ];
  facts.forEach(([v, l], i) => {
    const y = 2.8 + i * 0.83;
    s.addText(v, {
      x: 8.85, y, w: 1.15, h: 0.4, margin: 0, valign: 'middle',
      fontSize: 18, bold: true, color: INK, fontFace: HEAD,
    });
    s.addText(l, {
      x: 10.05, y: y - 0.05, w: 2.58, h: 0.75, margin: 0, valign: 'middle',
      fontSize: 11, color: MUTED, fontFace: TEXT, lineSpacingMultiple: 1.05,
    });
  });

  card(s, M, 5.42, CW, 1.15, INK);
  s.addText('The hybrid reaches F1 \u2248 0.29 against a target of 0.80. The usable classifier in this project came from local data alone \u2014 which is the central negative result, and more useful than a positive one.', {
    x: M + 0.45, y: 5.54, w: CW - 0.9, h: 0.92, margin: 0, valign: 'middle',
    fontSize: 13.5, color: SANDD, fontFace: TEXT, lineSpacingMultiple: 1.1,
  });
  s.addNotes('The weighting finding is the uncomfortable one: a scheme central to the data strategy turned out to do nothing measurable. Reporting it is the point.');
}

// ------------------------------------------------------------ 12. RQ2 cost
{
  const s = newSlide();
  title(s, 'RQ2 \u2014 operational cost', 'Measured per resource over four months and priced against published rates, under four scenarios');

  card(s, M, 2.0, 3.55, 2.15, SAND);
  s.addText('LKR 4,050', {
    x: M + 0.3, y: 2.2, w: 2.95, h: 0.72, margin: 0, valign: 'middle',
    fontSize: 33, bold: true, color: SAGE, fontFace: HEAD,
  });
  s.addText('per month, on the most conservative of the four scenarios \u2014 roughly 2.5\u00d7 inside the ceiling.', {
    x: M + 0.3, y: 2.96, w: 2.95, h: 1.0, margin: 0, valign: 'top',
    fontSize: 12.5, color: MUTED, fontFace: TEXT, lineSpacingMultiple: 1.08,
  });

  s.addChart(
    pres.ChartType.bar,
    [{ name: 'LKR / month', labels: ['Always-on\ndatabase', 'Container image\nstorage', 'All compute\n(3 services)'], values: [2828, 1140, 82] }],
    Object.assign(chartFrame(), {
      x: 4.5, y: 1.95, w: 8.13, h: 2.95,
      barDir: 'col', barGapWidthPct: 55,
      chartColors: [TERRA, TERRA, SAGE],
      varyColors: true,
      dataLabelFormatCode: '#,##0',
      valAxisLabelFormatCode: '#,##0',
    })
  );

  const outs = [
    ['Compute is not the cost', 'All three services total about LKR 82 per month and fall inside the free tier.'],
    ['The always-on database dominates', 'At roughly 70% of spend, the one component that cannot scale to zero is the one that costs money.'],
    ['Container images are a hidden line item', 'LKR 1,140 per month of accumulated build artefacts \u2014 real, but removable with a retention policy.'],
  ];
  outs.forEach(([h, sub], i) => {
    const x = M + i * 4.09;
    card(s, x, 5.1, 3.79, 1.32, SANDD);
    s.addText(h, {
      x: x + 0.26, y: 5.2, w: 3.28, h: 0.35, margin: 0, valign: 'middle',
      fontSize: 13, bold: true, color: INK, fontFace: TEXT,
    });
    s.addText(sub, {
      x: x + 0.26, y: 5.55, w: 3.28, h: 0.8, margin: 0, valign: 'top',
      fontSize: 11, color: MUTED, fontFace: TEXT, lineSpacingMultiple: 1.05,
    });
  });
  s.addNotes('Concede the incompleteness before being asked: the comparison against a persistent always-on deployment was argued architecturally, not benchmarked. That is a genuine gap in the RQ2 answer.');
}

// -------------------------------------------------------- 13. Usability
{
  const s = newSlide();
  title(s, 'Usability \u2014 what was found, and what was not', 'The planned SUS study did not run. A heuristic inspection was substituted and is reported as a substitution.');

  s.addChart(
    pres.ChartType.bar,
    // Reversed for the same reason: severity should read 4 at the top.
    [{ name: 'Findings', labels: ['1 \u2014 cosmetic', '2 \u2014 minor', '3 \u2014 major', '4 \u2014 catastrophe'], values: [3, 4, 5, 1] }],
    Object.assign(chartFrame(), {
      x: M, y: 2.05, w: 5.1, h: 2.95,
      barDir: 'bar', barGapWidthPct: 50,
      chartColors: [SAGELT, SAGELT, TERRA, TERRA],
      varyColors: true,
      dataLabelFormatCode: '0',
      valAxisMaxVal: 6, valAxisMinVal: 0,
    })
  );

  const finds = [
    ['F1', 'Neutral inputs on every construct return a HIGH risk band. The card explains what the number is, never what to do with it.', TERRA],
    ['F3', 'There is no workforce risk view. The system\u2019s primary question \u2014 who should I worry about? \u2014 has no interface.', TERRA],
    ['F13', 'A first-time user is not told where to begin. No onboarding, no entry-point cue.', SAGE],
  ];
  finds.forEach(([tag, text, col], i) => {
    const y = 2.05 + i * 1.02;
    badge(s, 6.05, y + 0.21, 0.5, tag, col);
    s.addText(text, {
      x: 6.75, y, w: 5.88, h: 0.92, margin: 0, valign: 'middle',
      fontSize: 12, color: BODY, fontFace: TEXT, lineSpacingMultiple: 1.06,
    });
  });

  card(s, M, 5.2, CW, 1.4, INK);
  s.addText('Taken together, F1, F3 and F13 indicate that the barrier to this system being adopted is not its accuracy.', {
    x: M + 0.45, y: 5.34, w: CW - 0.9, h: 0.5, margin: 0, valign: 'middle',
    fontSize: 15, bold: true, color: WHITE, fontFace: TEXT,
  });
  s.addText('Two evaluators contributed and the split is declared: the author, and an AI assistant driving a scripted browser. F13 could only have come from the human one \u2014 an automated evaluator cannot feel lost.', {
    x: M + 0.45, y: 5.86, w: CW - 0.9, h: 0.6, margin: 0, valign: 'middle',
    fontSize: 12, color: SANDD, fontFace: TEXT, lineSpacingMultiple: 1.08,
  });
  s.addNotes('Declare the AI second evaluator before being asked. The defensible position: it gave systematic coverage and a screenshot per claim, it is not a usability expert, and the most valuable finding came from the human. All three statements are in section 5.10.');
}

// ------------------------------------------------------- 14. Limitations
{
  const s = newSlide();
  title(s, 'Limitations', 'Stated in Chapter 6 without softening, and summarised here the same way');
  const lims = [
    ['Outcome', 'The Sri Lankan outcome is turnover intention, not observed departure. Every local claim is a claim about intention.'],
    ['Common method', 'Predictors and outcome come from one self-report instrument. The design cannot quantify how much that inflates the result.'],
    ['Sample size', '230 records, 33 positives, bootstrap interval [0.883, 0.982] \u2014 and drawn from startup professionals, not the SME population targeted.'],
    ['Fairness', 'Unvalidated for women and for employees over 25: two and six positive cases. The system should not run on real employees until that changes.'],
    ['Objective O5', 'Usability was inspected, not measured. The \u201cabove 80\u201d SUS target is neither met nor refuted.'],
    ['Compliance', 'What is established is a compliant design, not a compliance result. No real employee data was ever processed.'],
  ];
  lims.forEach(([tag, text], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = M + col * 6.17, y = 2.05 + row * 1.42;
    card(s, x, y, 5.87, 1.2, SAND);
    s.addText(tag, {
      x: x + 0.28, y: y + 0.1, w: 5.3, h: 0.3, margin: 0, valign: 'middle',
      fontSize: 12, bold: true, color: TERRA, fontFace: TEXT, charSpacing: 1,
    });
    s.addText(text, {
      x: x + 0.28, y: y + 0.4, w: 5.32, h: 0.74, margin: 0, valign: 'top',
      fontSize: 11.5, color: BODY, fontFace: TEXT, lineSpacingMultiple: 1.06,
    });
  });
  s.addNotes('Do not rush this slide. Volunteering the limitations is what makes the positive claims credible, and examiners reward it.');
}

// ----------------------------------------------------- 15. Contributions
{
  const s = newSlide();
  title(s, 'Contributions', 'Four claims, in order of weight');
  const cons = [
    ['1', 'Attrition models do not transfer across national contexts', 'On shared demographic features: 0.937 local against 0.641 transfer, surviving leakage correction, estimator substitution and alternative binarisation.'],
    ['2', 'A cost-viable serverless reference architecture', 'Measured rather than estimated, with the finding that compute is not the cost \u2014 the always-on database is.'],
    ['3', 'A working construct-capture mechanism', 'The Pulse Check produces the model\u2019s own inputs inside the product, closing the gap between a model that scores well and one that can be operated.'],
    ['4', 'Negative and infeasible results reported, not suppressed', 'The transfer failure, the immaterial weighting scheme, and the structural impossibility of fairness validation on this sample.'],
  ];
  cons.forEach(([num, h, sub], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = M + col * 6.17, y = 2.05 + row * 2.05;
    card(s, x, y, 5.87, 1.82, i === 0 ? SANDD : SAND);
    badge(s, x + 0.3, y + 0.24, 0.5, num, i === 0 ? TERRA : SAGE);
    s.addText(h, {
      x: x + 0.94, y: y + 0.2, w: 4.7, h: 0.58, margin: 0, valign: 'middle',
      fontSize: 14, bold: true, color: INK, fontFace: TEXT, lineSpacingMultiple: 1.02,
    });
    s.addText(sub, {
      x: x + 0.3, y: y + 0.88, w: 5.32, h: 0.82, margin: 0, valign: 'top',
      fontSize: 11.5, color: MUTED, fontFace: TEXT, lineSpacingMultiple: 1.06,
    });
  });
  s.addNotes('Contribution one is the thesis. If only one thing is remembered from this presentation, it should be that borrowing an international attrition model does not work for this context.');
}

// ------------------------------------------------------------- 16. Demo
{
  const s = newSlide();
  title(s, 'Demonstration', 'Live on the deployed development environment');
  const steps = [
    ['1', 'Sign in and open an employee', 'The HR platform \u2014 payroll, leave and attendance \u2014 is the system of record the predictions attach to.'],
    ['2', 'Score attrition risk', 'Eight constructs produce a probability, a band, the disclosed threshold, and the SHAP factors behind that specific prediction.'],
    ['3', 'Submit a Pulse Check', 'Sixteen Likert items become the eight constructs automatically, and the prediction is cached per employee per week.'],
    ['4', 'Confirm the privacy boundary', 'The employee sees a confirmation and never a risk score. That is verified, not asserted.'],
  ];
  // Heading and description are both top-aligned on the same y. Mixing
  // valign 'middle' for one column with 'top' for the other made the two
  // columns visibly fail to line up.
  steps.forEach(([num, h, sub], i) => {
    const y = 2.0 + i * 0.98;
    badge(s, M, y + 0.02, 0.48, num, SAGE);
    s.addText(h, {
      x: M + 0.7, y, w: 3.55, h: 0.52, margin: 0, valign: 'top',
      fontSize: 14.5, bold: true, color: INK, fontFace: TEXT, lineSpacingMultiple: 1.02,
    });
    s.addText(sub, {
      x: 4.5, y: y + 0.02, w: 8.13, h: 0.78, margin: 0, valign: 'top',
      fontSize: 12, color: MUTED, fontFace: TEXT, lineSpacingMultiple: 1.06,
    });
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: M, y: 5.98, w: CW, h: 0.88, rectRadius: 0.06,
    fill: { color: SANDD }, line: { color: SANDD },
  });
  s.addText('If the first prediction takes about twenty seconds, that is the scale-to-zero decision made visible \u2014 the instance is cold. Warm responses run in half a second to one second. Keeping an instance always warm would break the cost result on the previous slide.', {
    x: M + 0.35, y: 6.06, w: CW - 0.7, h: 0.72, margin: 0, valign: 'middle',
    fontSize: 11.5, color: BODY, fontFace: TEXT, italic: true, lineSpacingMultiple: 1.05,
  });
  s.addNotes('Warm the service up immediately before the viva by making one prediction. If it is cold in front of the panel, do not apologise - explain it as the cost trade-off, which is exactly what it is.');
}

// ------------------------------------------------------- 17. Future work
{
  const s = newSlide();
  title(s, 'Future work', 'Ordered by how much each would change the conclusions');
  const fw = [
    ['Obtain observed attrition data from a partner SME', 'The single highest-value next step. It would dissolve the label-shift confound and let the local model be judged against departures rather than intentions.', TERRA],
    ['Build the workforce risk view and an onboarding path', 'Both are additions rather than corrections, and the adoption literature says they matter more than accuracy does.', SAGE],
    ['Run the usability study', 'The protocol is fully specified in \u00a75.10 and directly executable with independent evaluators. It would close the one objective this work leaves open.', SAGE],
    ['Validate fairness on an adequate sample', 'Subgroup performance should be a deployment precondition. Age and gender should also be dropped from the transfer model outright — removing them costs nothing.', SAGE],
    ['Move the always-on database to a scale-to-zero tier', 'It is roughly 70% of operational spend, so it is the obvious next architectural target.', SAGE],
  ];
  fw.forEach(([h, sub, col], i) => {
    const y = 2.0 + i * 0.96;
    badge(s, M, y + 0.02, 0.44, String(i + 1), col);
    s.addText(h, {
      x: M + 0.64, y, w: 5.05, h: 0.5, margin: 0, valign: 'top',
      fontSize: 13.5, bold: true, color: INK, fontFace: TEXT, lineSpacingMultiple: 1.0,
    });
    s.addText(sub, {
      x: 6.05, y: y + 0.02, w: 6.58, h: 0.78, margin: 0, valign: 'top',
      fontSize: 11.5, color: MUTED, fontFace: TEXT, lineSpacingMultiple: 1.06,
    });
  });
  s.addNotes('If asked what I would do differently: collect Sri Lankan outcome data first and treat the international sources as a comparison rather than a substitute.');
}

// ---------------------------------------------------------- 18. Closing
{
  const s = newSlide(true);
  s.addShape(pres.ShapeType.ellipse, {
    x: -1.3, y: 3.6, w: 5.2, h: 5.2, fill: { color: SAGE, transparency: 76 }, line: { color: SAGE, transparency: 76 },
  });
  s.addShape(pres.ShapeType.ellipse, {
    x: 10.2, y: -1.5, w: 4.6, h: 4.6, fill: { color: TERRA, transparency: 70 }, line: { color: TERRA, transparency: 70 },
  });
  s.addText('The most useful thing this project produced was not the strong model, but the weak one.', {
    x: 1.6, y: 2.2, w: 10.1, h: 1.7, margin: 0, align: 'center', valign: 'middle',
    fontSize: 27, bold: true, color: WHITE, fontFace: HEAD, lineSpacingMultiple: 1.12,
  });
  s.addText('International attrition data cannot substitute for local data collection in this domain \u2014 and that is precisely the gap the project set out to examine.', {
    x: 2.3, y: 4.0, w: 8.7, h: 0.9, margin: 0, align: 'center', valign: 'middle',
    fontSize: 14, color: SANDD, fontFace: TEXT, italic: true, lineSpacingMultiple: 1.1,
  });
  s.addText('Thank you \u2014 questions welcome', {
    x: 2.3, y: 5.35, w: 8.7, h: 0.5, margin: 0, align: 'center', valign: 'middle',
    fontSize: 17, bold: true, color: SAGELT, fontFace: TEXT,
  });
  s.addText('Theekshana Gimhan  |  15002  |  COM 4901', {
    x: 2.3, y: 5.95, w: 8.7, h: 0.35, margin: 0, align: 'center', valign: 'middle',
    fontSize: 11.5, color: MUTED, fontFace: TEXT, charSpacing: 1.2,
  });
  s.addNotes('Close on the reflection from section 6.5 rather than on a summary of findings - it is the sentence that frames every negative result in the deck as intentional.');
}

pres.writeFile({ fileName: OUT }).then(() => console.log('Wrote ' + OUT + '  (' + n + ' slides)'));
