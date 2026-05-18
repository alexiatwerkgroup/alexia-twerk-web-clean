' Auto-execute shield update push
Set objShell = CreateObject("WScript.Shell")
strPath = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
objShell.CurrentDirectory = strPath

' Execute PowerShell script
objShell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & strPath & "\push-shield.ps1""", 1, True
