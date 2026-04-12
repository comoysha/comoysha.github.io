export const TYPE_FIELDS = {
  visit:      { summary: "就诊概要 *", hospital: true, doctor: true, diagnosis: true, medications: true, tests: false, notes: true },
  medication: { summary: "用药概要 *", hospital: "选填", doctor: "选填", diagnosis: false, medications: true, tests: false, notes: true },
  test:       { summary: "检查概要 *", hospital: true, doctor: "选填", diagnosis: "选填", medications: false, tests: true, notes: true },
  symptom:    { summary: "症状描述 *", hospital: false, doctor: false, diagnosis: "选填", medications: false, tests: false, notes: true },
  note:       { summary: "内容 *",     hospital: false, doctor: false, diagnosis: false, medications: false, tests: false, notes: true },
};
