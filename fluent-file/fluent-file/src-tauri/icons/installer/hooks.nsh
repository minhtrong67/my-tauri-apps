; Fluent File - NSIS installer hooks (Tauri 2).
; Adds "Open with Fluent File" to the Explorer context menu of folders and folder backgrounds,
; and removes it again on uninstall. Per-user (HKCU), so no administrator rights are needed.

!macro NSIS_HOOK_POSTINSTALL
  WriteRegStr HKCU "Software\Classes\Directory\shell\FluentFile" "" "Open with Fluent File"
  WriteRegStr HKCU "Software\Classes\Directory\shell\FluentFile" "Icon" "$\"$INSTDIR\${MAINBINARYNAME}.exe$\""
  WriteRegStr HKCU "Software\Classes\Directory\shell\FluentFile\command" "" "$\"$INSTDIR\${MAINBINARYNAME}.exe$\" $\"%1$\""
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\FluentFile" "" "Open Fluent File here"
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\FluentFile" "Icon" "$\"$INSTDIR\${MAINBINARYNAME}.exe$\""
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\FluentFile\command" "" "$\"$INSTDIR\${MAINBINARYNAME}.exe$\" $\"%V$\""
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  DeleteRegKey HKCU "Software\Classes\Directory\shell\FluentFile"
  DeleteRegKey HKCU "Software\Classes\Directory\Background\shell\FluentFile"
!macroend
