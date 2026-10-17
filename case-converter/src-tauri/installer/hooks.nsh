; Extra NSIS settings for the Case Converter installer (loaded by Tauri before the pages are defined).
; Gives the uninstaller its own icon and header image. If this NSIS version lacks __FILEDIR__,
; the block is skipped and the default uninstaller look is used.
!ifdef __FILEDIR__
  !define MUI_UNICON "${__FILEDIR__}\..\icons\uninstall.ico"
  !define MUI_HEADERIMAGE_UNBITMAP "${__FILEDIR__}\..\icons\uninstall-header.bmp"
!endif
