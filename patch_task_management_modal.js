const fs = require('fs');
let code = fs.readFileSync('src/components/TaskManagementModal.tsx', 'utf8');

if (!code.includes('confirmDeleteId')) {
  code = code.replace(/const \{ isLightMode \} = useTheme\(\);/, 'const { isLightMode } = useTheme();\n  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);');

  code = code.replace(/onClick=\{\(e\) => \{\n\s+e\.preventDefault\(\);\n\s+e\.stopPropagation\(\);\n\s+if \(\n\s+window\.confirm\([\s\S]*?\)\n\s+\) \{\n\s+onDeleteTask\(task\.id\);\n\s+\}\n\s+\}\}/, `onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (confirmDeleteId === task.id) {
                              onDeleteTask(task.id);
                              setConfirmDeleteId(null);
                            } else {
                              setConfirmDeleteId(task.id);
                              // Auto-cancel after 3 seconds
                              setTimeout(() => setConfirmDeleteId(null), 3000);
                            }
                          }}`);
  
  code = code.replace(/<Trash2 className="w-3\.5 h-3\.5" \/>/g, `{confirmDeleteId === task.id ? <span className="text-[10px] font-black uppercase">Confirm?</span> : <Trash2 className="w-3.5 h-3.5" />}`);
  
  fs.writeFileSync('src/components/TaskManagementModal.tsx', code);
}
