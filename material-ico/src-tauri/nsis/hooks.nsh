; Shows the Material-styled uninstall icon in Windows "Apps & features".
!macro NSIS_HOOK_POSTINSTALL
  WriteRegStr SHCTX "${UNINSTKEY}" "DisplayIcon" "$INSTDIR\icons\uninstall.ico"
!macroend
