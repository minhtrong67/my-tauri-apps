; Material Docx — NSIS installer hooks.
; Tauri's default template only sets the installer icon, which leaves uninstall.exe with the generic NSIS icon.
; Setting it here covers both cases: if the MUI interface is built after this file is included the define is used,
; and if it was already built the direct UninstallIcon instruction overrides it.
!ifdef MUI_UNICON
  !undef MUI_UNICON
!endif
!define MUI_UNICON "${__FILEDIR__}\icons\uninstaller.ico"
UninstallIcon "${__FILEDIR__}\icons\uninstaller.ico"
