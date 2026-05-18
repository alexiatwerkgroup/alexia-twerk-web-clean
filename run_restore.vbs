Dim objShell
Set objShell = CreateObject("WScript.Shell")

' Get the script's directory
strScriptDir = objShell.CurrentDirectory
If Right(strScriptDir, 1) <> "\" Then
    strScriptDir = strScriptDir & "\"
End If

' Execute the Python script
strPythonScript = strScriptDir & "restore_playlists.py"
strCommand = "python.exe """ & strPythonScript & """"

' Run the command
objShell.Run strCommand, 1, True

' Show completion message
MsgBox "Restauracion completada. Verifica la consola para detalles.", vbInformation, "Playlists Restore"
