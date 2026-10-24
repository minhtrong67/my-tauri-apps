; Material File - NSIS installer hooks (Tauri 2).
; Adds "Open with Material File" to the Explorer context menu of folders and folder backgrounds,
; and removes it again on uninstall. Per-user (HKCU), so no administrator rights are needed.

!macro NSIS_HOOK_POSTINSTALL
  WriteRegStr HKCU "Software\Classes\Directory\shell\MaterialFile" "" "Open with Material File"
  WriteRegStr HKCU "Software\Classes\Directory\shell\MaterialFile" "Icon" "$\"$INSTDIR\${MAINBINARYNAME}.exe$\""
  WriteRegStr HKCU "Software\Classes\Directory\shell\MaterialFile\command" "" "$\"$INSTDIR\${MAINBINARYNAME}.exe$\" $\"%1$\""
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\MaterialFile" "" "Open Material File here"
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\MaterialFile" "Icon" "$\"$INSTDIR\${MAINBINARYNAME}.exe$\""
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\MaterialFile\command" "" "$\"$INSTDIR\${MAINBINARYNAME}.exe$\" $\"%V$\""
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  DeleteRegKey HKCU "Software\Classes\Directory\shell\MaterialFile"
  DeleteRegKey HKCU "Software\Classes\Directory\Background\shell\MaterialFile"
!macroend
