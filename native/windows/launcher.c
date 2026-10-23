/* Legacy 0.15 browser launcher, kept for source history only. The installer uses launcher.cpp. */
#ifndef UNICODE
#define UNICODE
#endif
#ifndef _UNICODE
#define _UNICODE
#endif
#include <windows.h>
#include <shellapi.h>
#include <wchar.h>
static const wchar_t *site=L"https://pongy-ai.devs.surf/?pongy_app=windows&client_version=0.15.0";
int WINAPI wWinMain(HINSTANCE h,HINSTANCE old,LPWSTR cmd,int show){
 wchar_t path[32768],args[1024];const wchar_t *vars[]={L"ProgramFiles(x86)",L"ProgramFiles",L"LOCALAPPDATA"};
 for(int i=0;i<3;i++){DWORD n=GetEnvironmentVariableW(vars[i],path,32000);if(!n||n>=32000)continue;wcscat(path,L"\\Microsoft\\Edge\\Application\\msedge.exe");
 if(GetFileAttributesW(path)==INVALID_FILE_ATTRIBUTES)continue;
 swprintf(args,1024,L"--app=\"%ls\"",site);
 if((INT_PTR)ShellExecuteW(NULL,L"open",path,args,NULL,SW_SHOWNORMAL)>32)return 0;
 }
 if((INT_PTR)ShellExecuteW(NULL,L"open",site,NULL,NULL,SW_SHOWNORMAL)>32)return 0;
 MessageBoxW(NULL,L"Pongy AI could not open your browser. Please install or repair a browser and try again.",L"Pongy AI",MB_OK|MB_ICONERROR);return 1;
}
