const fs = require('fs');
let code = fs.readFileSync('src/components/TaskAssignModal.tsx', 'utf8');

code = code.replace(/if \(!editingTask && !title\) \{/g, 'if ((!editingTask || isDuplicate) && !title) {');
code = code.replace(/if \(editingTask\) \{/g, 'if (editingTask && !isDuplicate) {');
code = code.replace(/\{editingTask \? <Tag /g, '{editingTask && !isDuplicate ? <Tag ');
code = code.replace(/\{editingTask \? 'EDIT CHECKLIST TASK' : 'CREATE CHECKLIST TASK'\}/g, "{editingTask && !isDuplicate ? 'EDIT CHECKLIST TASK' : isDuplicate ? 'DUPLICATE CHECKLIST TASK' : 'CREATE CHECKLIST TASK'}");
code = code.replace(/\{!editingTask && stagedTasks\.length > 0 && \(/g, '{(!editingTask || isDuplicate) && stagedTasks.length > 0 && (');
code = code.replace(/\{!editingTask && \(/g, '{(!editingTask || isDuplicate) && (');
code = code.replace(/\{editingTask\n\s+\? 'SAVE CHANGES'/g, '{editingTask && !isDuplicate\n                  ? \'SAVE CHANGES\'');

code = code.replace(/useEffect\(\(\) => \{\n\s+if \(editingTask && !isDuplicate\) \{/g, 'useEffect(() => {\n    if (editingTask) {');

fs.writeFileSync('src/components/TaskAssignModal.tsx', code);
