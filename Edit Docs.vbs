' Double-click to launch the local docs editor.
' Starts the Python save-server with no console window and opens the editor in your browser.
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
here = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = here
' 0 = hidden window, False = don't wait. pythonw runs with no console.
sh.Run "pythonw.exe " & Chr(34) & fso.BuildPath(here, "server.py") & Chr(34), 0, False
