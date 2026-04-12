import { TYPE_FIELDS } from '../config/typeFields.js';
import ItemList from './ItemList.jsx';

export default function TypedFormFields({ type, state, setState, inputStyle }) {
  const fields = TYPE_FIELDS[type] || TYPE_FIELDS.note;
  const set = function(k) { return function(e) { const o = {}; o[k] = e.target.value; setState(Object.assign({}, state, o)); }; };
  const setArr = function(k) { return function(arr) { const o = {}; o[k] = arr; setState(Object.assign({}, state, o)); }; };
  return (
    <>
      <input type="date" value={state.date} onChange={set("date")} style={Object.assign({}, inputStyle, { marginBottom: 8 })} />
      <input placeholder={fields.summary} value={state.summary} onChange={set("summary")} style={Object.assign({}, inputStyle, { marginBottom: 8 })} autoFocus />
      {fields.hospital && <input placeholder={fields.hospital === true ? "医院" : "医院（选填）"} value={state.hospital} onChange={set("hospital")} style={Object.assign({}, inputStyle, { marginBottom: 8 })} />}
      {fields.doctor && <input placeholder={fields.doctor === true ? "医生" : "医生（选填）"} value={state.doctor} onChange={set("doctor")} style={Object.assign({}, inputStyle, { marginBottom: 8 })} />}
      {fields.diagnosis && <input placeholder={fields.diagnosis === true ? "诊断" : "诊断（选填）"} value={state.diagnosis} onChange={set("diagnosis")} style={Object.assign({}, inputStyle, { marginBottom: 8 })} />}
      {fields.medications && <ItemList items={state.medications || []} onChange={setArr("medications")} nameLabel="药名" valueLabel="用法用量" valueKey="dosage" />}
      {fields.tests && <ItemList items={state.tests || []} onChange={setArr("tests")} nameLabel="检查项" valueLabel="结果" valueKey="result" />}
      {fields.notes && <textarea placeholder="补充备注（选填）" value={state.notes} onChange={set("notes")} rows={2} style={Object.assign({}, inputStyle, { marginBottom: 8, resize: "vertical" })} />}
    </>
  );
}
