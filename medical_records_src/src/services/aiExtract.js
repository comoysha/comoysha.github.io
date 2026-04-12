export const PROMPT_TEXT = "你是医疗单据识别助手。请从图片中提取所有可识别的医疗信息，填入对应字段。无法识别的字段填空字符串或空数组。type 根据内容判断：就诊填 visit，用药填 medication，检查报告填 test，症状记录填 symptom，其他填 note。";

export const MEDICAL_RECORD_SCHEMA = {
  type: "json_schema",
  name: "medical_record",
  strict: true,
  schema: {
    type: "object",
    properties: {
      date: { type: "string", description: "日期 YYYY-MM-DD，无法识别则空字符串" },
      hospital: { type: "string", description: "医院名称，无则空字符串" },
      doctor: { type: "string", description: "医生姓名，无则空字符串" },
      diagnosis: { type: "string", description: "诊断结果，无则空字符串" },
      medications: {
        type: "array",
        items: {
          type: "object",
          properties: { name: { type: "string", description: "药品名称" }, dosage: { type: "string", description: "用法用量" } },
          required: ["name", "dosage"], additionalProperties: false
        }
      },
      tests: {
        type: "array",
        items: {
          type: "object",
          properties: { name: { type: "string", description: "检查项目" }, result: { type: "string", description: "检查结果" } },
          required: ["name", "result"], additionalProperties: false
        }
      },
      summary: { type: "string", description: "一句话概要" },
      type: { type: "string", description: "记录类型：visit|medication|test|symptom|note" },
      notes: { type: "string", description: "补充备注信息，无则空字符串" }
    },
    required: ["date", "hospital", "doctor", "diagnosis", "medications", "tests", "summary", "type", "notes"],
    additionalProperties: false
  }
};

export const TYPE_PROMPTS = {
  visit: "记录类型：就诊记录。请重点提取：就诊日期、医院名称、医生姓名、诊断结果、开具的药物（药名、剂量）、检查项目（名称、结果），并生成一句话总结。",
  medication: "记录类型：用药记录。请重点提取：日期、所有药物信息（药名、剂量用法），以及开药医院和医生（如有）。药物信息是核心。",
  test: "记录类型：检查记录。请重点提取：检查日期、医院、所有检查/化验项目（名称、结果），以及医生和诊断（如有）。",
  symptom: "记录类型：症状记录。请重点提取：症状出现日期、症状的详细描述作为summary，以及可能的诊断（如有）。",
  note: "记录类型：备注。请提取日期，将主要内容整理为summary，补充细节放入notes。",
};

export async function extractFromImage(base64Data, mediaType, config) {
  try {
    const baseUrl = config.url.replace(/\/$/, "");
    const apiType = config.apiType || "responses";
    let url, body;

    if (apiType === "responses") {
      url = baseUrl + "/responses";
      body = {
        model: config.endpoint,
        thinking: { type: "disabled" },
        text: { format: MEDICAL_RECORD_SCHEMA },
        input: [
          { role: "system", content: PROMPT_TEXT },
          { role: "user", content: [
            { type: "input_image", image_url: "data:" + mediaType + ";base64," + base64Data },
            { type: "input_text", text: "请识别这张医疗单据/报告的内容。" },
          ]},
        ],
      };
    } else {
      url = baseUrl + "/chat/completions";
      body = {
        model: config.endpoint,
        max_tokens: 1000,
        messages: [
          { role: "system", content: PROMPT_TEXT },
          { role: "user", content: [
            { type: "image_url", image_url: { url: "data:" + mediaType + ";base64," + base64Data } },
            { type: "text", text: "请识别这张医疗单据/报告的内容，以JSON格式返回。" },
          ]},
        ],
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + config.apiKey },
      body: JSON.stringify(body),
    });
    const data = await response.json();

    let text = "";
    if (apiType === "responses") {
      text = (data.output || []).filter(o => o.type === "message").map(o => (o.content || []).filter(c => c.type === "output_text").map(c => c.text).join("")).join("") || "";
    } else {
      text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
    }
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch (e) {
    console.error("OCR failed:", e);
    return null;
  }
}

export async function extractFromText(text, type, config) {
  try {
    const baseUrl = config.url.replace(/\/$/, "");
    const apiType = config.apiType || "responses";
    const typePrompt = TYPE_PROMPTS[type] || TYPE_PROMPTS.note;
    const sysPrompt = "你是医疗记录解析助手。用户会提供一段关于医疗/健康的文字描述，请从中提取结构化信息。无法确定的字段填空字符串或空数组。type固定填\"" + type + "\"。\n" + typePrompt;
    let url, body;

    if (apiType === "responses") {
      url = baseUrl + "/responses";
      body = {
        model: config.endpoint,
        thinking: { type: "disabled" },
        text: { format: MEDICAL_RECORD_SCHEMA },
        input: [
          { role: "system", content: sysPrompt },
          { role: "user", content: [{ type: "input_text", text: text }] },
        ],
      };
    } else {
      url = baseUrl + "/chat/completions";
      body = {
        model: config.endpoint, max_tokens: 1000,
        messages: [
          { role: "system", content: sysPrompt },
          { role: "user", content: text },
        ],
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + config.apiKey },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    let resultText = "";
    if (apiType === "responses") {
      resultText = (data.output || []).filter(o => o.type === "message").map(o => (o.content || []).filter(c => c.type === "output_text").map(c => c.text).join("")).join("") || "";
    } else {
      resultText = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
    }
    return JSON.parse(resultText.replace(/```json|```/g, "").trim());
  } catch (e) {
    console.error("Text extraction failed:", e);
    return null;
  }
}
