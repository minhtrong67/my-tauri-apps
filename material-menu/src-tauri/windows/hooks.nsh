; Offer to restore the default Windows context menu before uninstalling.
!macro NSIS_HOOK_PREUNINSTALL
  MessageBox MB_YESNO|MB_ICONQUESTION "Restore the default Windows context menu before uninstalling?$\r$\n(Removes your custom commands and shows hidden items.)$\r$\n$\r$\nKhôi phục menu chuột phải mặc định của Windows trước khi gỡ cài đặt?" /SD IDNO IDNO mm_skip_reset
    nsExec::Exec '"$INSTDIR\${MAINBINARYNAME}.exe" --reset'
  mm_skip_reset:
!macroend
