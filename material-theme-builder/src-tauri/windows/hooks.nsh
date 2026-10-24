; Custom NSIS hooks for Material Theme Builder.
; Shows the dedicated uninstall icon in "Apps & features" / "Programs and Features".

!macro NSIS_HOOK_PREINSTALL
!macroend

!macro NSIS_HOOK_POSTINSTALL
  IfFileExists "$INSTDIR\uninstall.ico" 0 +2
    WriteRegStr SHCTX "${UNINSTKEY}" "DisplayIcon" "$INSTDIR\uninstall.ico"
!macroend

!macro NSIS_HOOK_PREUNINSTALL
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
!macroend
