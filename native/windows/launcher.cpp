#define UNICODE
#define _UNICODE
#include <windows.h>
#include <shlobj.h>
#include <shellapi.h>
#include <string>
#include <WebView2.h>
#ifdef __MINGW32__
__CRT_UUID_DECL(ICoreWebView2WebMessageReceivedEventHandler,0x57213f19,0x00e6,0x49fa,0x8e,0x07,0x89,0x8e,0xa0,0x1e,0xcb,0xd2)
__CRT_UUID_DECL(ICoreWebView2NavigationCompletedEventHandler,0xd33a35bf,0x1c49,0x4f98,0x93,0xab,0x00,0x6e,0x05,0x33,0xfe,0x1c)
__CRT_UUID_DECL(ICoreWebView2NavigationStartingEventHandler,0x9adbe429,0xf36d,0x432b,0x9d,0xdc,0xf8,0x88,0x1f,0xbd,0x76,0xe3)
__CRT_UUID_DECL(ICoreWebView2NewWindowRequestedEventHandler,0xd4c185fe,0xc81c,0x4989,0x97,0xaf,0x2d,0x3f,0xa7,0xab,0x56,0x51)
__CRT_UUID_DECL(ICoreWebView2CreateCoreWebView2ControllerCompletedHandler,0x6c4819f3,0xc9b7,0x4260,0x81,0x27,0xc9,0xf5,0xbd,0xe7,0xf6,0x8c)
__CRT_UUID_DECL(ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler,0x4e8a3389,0xc9d8,0x4bd2,0xb6,0xb5,0x12,0x4f,0xee,0x6c,0xc1,0x4d)
#endif
static std::wstring initialLanguage(){wchar_t value[8]={};DWORD bytes=sizeof(value);return RegGetValueW(HKEY_CURRENT_USER,L"Software\\Pongy AI Dev\\Pongy AI",L"InitialLanguage",RRF_RT_REG_SZ,nullptr,value,&bytes)==ERROR_SUCCESS&&wcscmp(value,L"ru")==0?L"ru":L"en";}
static HWND mainWindow;static ICoreWebView2Controller* controller=nullptr;static ICoreWebView2* view=nullptr;
static bool offlineScreen=false;
static const wchar_t* site=L"https://pongy-ai.devs.surf/?pongy_app=windows&client_version=0.24.1";
static bool trusted(const wchar_t* u){std::wstring s=u?u:L"";const std::wstring origin=L"https://pongy-ai.devs.surf";return s==origin||s.rfind(origin+L"/",0)==0;}
static void external(const wchar_t* u){if(u&&wcsncmp(u,L"https://",8)==0)ShellExecuteW(mainWindow,L"open",u,nullptr,nullptr,SW_SHOWNORMAL);}
template<class I> struct Handler: I {ULONG refs=1;HRESULT STDMETHODCALLTYPE QueryInterface(REFIID id,void** out)override{if(!out)return E_POINTER;*out=nullptr;if(IsEqualIID(id,IID_IUnknown)||IsEqualIID(id,__uuidof(I))){*out=static_cast<I*>(this);AddRef();return S_OK;}return E_NOINTERFACE;}ULONG STDMETHODCALLTYPE AddRef()override{return InterlockedIncrement(&refs);}ULONG STDMETHODCALLTYPE Release()override{ULONG n=InterlockedDecrement(&refs);if(!n)delete this;return n;}virtual ~Handler()=default;};
struct Navigation:Handler<ICoreWebView2NavigationStartingEventHandler>{HRESULT STDMETHODCALLTYPE Invoke(ICoreWebView2*,ICoreWebView2NavigationStartingEventArgs* args)override{LPWSTR uri=nullptr;args->get_Uri(&uri);if(trusted(uri))offlineScreen=false;if(!trusted(uri)&&!(offlineScreen&&uri&&wcscmp(uri,L"about:blank")==0)){args->put_Cancel(TRUE);external(uri);}CoTaskMemFree(uri);return S_OK;}};
struct Popup:Handler<ICoreWebView2NewWindowRequestedEventHandler>{HRESULT STDMETHODCALLTYPE Invoke(ICoreWebView2*,ICoreWebView2NewWindowRequestedEventArgs* args)override{LPWSTR uri=nullptr;args->get_Uri(&uri);args->put_Handled(TRUE);external(uri);CoTaskMemFree(uri);return S_OK;}};
// This fallback contains no user history, credentials, API calls, or local-file access.
static void showOffline(){
 HRSRC resource=FindResourceW(GetModuleHandleW(nullptr),MAKEINTRESOURCEW(2),RT_RCDATA);
 if(!resource||!view)return;
 HGLOBAL data=LoadResource(GetModuleHandleW(nullptr),resource);
 const char* bytes=static_cast<const char*>(LockResource(data));
 int size=static_cast<int>(SizeofResource(GetModuleHandleW(nullptr),resource));
 int length=bytes?MultiByteToWideChar(CP_UTF8,MB_ERR_INVALID_CHARS,bytes,size,nullptr,0):0;
 if(length<=0)return;
 std::wstring html(length,L'\0');MultiByteToWideChar(CP_UTF8,MB_ERR_INVALID_CHARS,bytes,size,&html[0],length);
 offlineScreen=true;view->NavigateToString(html.c_str());
}
struct Completed:Handler<ICoreWebView2NavigationCompletedEventHandler>{
 HRESULT STDMETHODCALLTYPE Invoke(ICoreWebView2*,ICoreWebView2NavigationCompletedEventArgs* args)override{
  BOOL success=FALSE;args->get_IsSuccess(&success);
  if(success){LPWSTR uri=nullptr;view->get_Source(&uri);if(trusted(uri))offlineScreen=false;CoTaskMemFree(uri);return S_OK;}
  COREWEBVIEW2_WEB_ERROR_STATUS error;args->get_WebErrorStatus(&error);
  if(error!=COREWEBVIEW2_WEB_ERROR_STATUS_OPERATION_CANCELED&&!offlineScreen)showOffline();
  return S_OK;
 }
};

// Narrow Windows bridge. No command lines, arbitrary paths, shell scripts or background file access.
struct DesktopMessage:Handler<ICoreWebView2WebMessageReceivedEventHandler>{
 HRESULT STDMETHODCALLTYPE Invoke(ICoreWebView2*,ICoreWebView2WebMessageReceivedEventArgs* args)override{
  LPWSTR source=nullptr;args->get_Source(&source);const bool allowed=trusted(source);CoTaskMemFree(source);if(!allowed||offlineScreen)return S_OK;
  LPWSTR raw=nullptr;if(FAILED(args->TryGetWebMessageAsString(&raw)))return S_OK;std::wstring message=raw?raw:L"";CoTaskMemFree(raw);
  if(message==L"pongy:foreground"){
   ShowWindow(mainWindow,IsIconic(mainWindow)?SW_RESTORE:SW_SHOW);SetForegroundWindow(mainWindow);
   FLASHWINFO flash={sizeof(FLASHWINFO),mainWindow,FLASHW_TRAY|FLASHW_TIMERNOFG,3,0};FlashWindowEx(&flash);return S_OK;
  }
  std::wstring name,executable;wchar_t directory[MAX_PATH]={};
  if(message==L"pongy:open:notepad"){name=L"Notepad";GetSystemDirectoryW(directory,MAX_PATH);executable=std::wstring(directory)+L"\\notepad.exe";}
  else if(message==L"pongy:open:calculator"){name=L"Calculator";GetSystemDirectoryW(directory,MAX_PATH);executable=std::wstring(directory)+L"\\calc.exe";}
  else if(message==L"pongy:open:explorer"){name=L"File Explorer";GetWindowsDirectoryW(directory,MAX_PATH);executable=std::wstring(directory)+L"\\explorer.exe";}
  else return S_OK;
  const std::wstring question=L"Allow Pongy AI to open "+name+L"? / Разрешить открыть приложение?";
  if(MessageBoxW(mainWindow,question.c_str(),L"Pongy AI — Windows",MB_YESNO|MB_ICONQUESTION|MB_DEFBUTTON2)!=IDYES)return S_OK;
  auto result=ShellExecuteW(mainWindow,L"open",executable.c_str(),nullptr,nullptr,SW_SHOWNORMAL);
  if(reinterpret_cast<INT_PTR>(result)<=32)MessageBoxW(mainWindow,L"Could not open the application. / Не удалось открыть приложение.",L"Pongy AI",MB_OK|MB_ICONWARNING);
  return S_OK;
 }
};

struct Ready:Handler<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler>{HRESULT STDMETHODCALLTYPE Invoke(HRESULT result,ICoreWebView2Controller* c)override{if(FAILED(result)||!c){MessageBoxW(mainWindow,L"Could not start the application renderer. Repair Microsoft Edge WebView2 Runtime and reopen Pongy AI.",L"Pongy AI",MB_OK|MB_ICONERROR);return S_OK;}controller=c;c->AddRef();c->get_CoreWebView2(&view);RECT r;GetClientRect(mainWindow,&r);c->put_Bounds(r);ICoreWebView2Settings* settings=nullptr;view->get_Settings(&settings);if(settings){settings->put_AreHostObjectsAllowed(FALSE);settings->Release();}EventRegistrationToken token;auto desktop=new DesktopMessage;view->add_WebMessageReceived(desktop,&token);desktop->Release();auto nav=new Navigation;view->add_NavigationStarting(nav,&token);nav->Release();auto completed=new Completed;view->add_NavigationCompleted(completed,&token);completed->Release();auto pop=new Popup;view->add_NewWindowRequested(pop,&token);pop->Release();std::wstring lang=initialLanguage();std::wstring script=L"if(location.origin==='https://pongy-ai.devs.surf'){window.PongyDesktop=Object.freeze({bringToFront:function(){window.chrome.webview.postMessage('pongy:foreground')},openApp:function(name){if(['notepad','calculator','explorer'].includes(name))window.chrome.webview.postMessage('pongy:open:'+name)}});window.PongyNative=Object.freeze({desktopActions:['notepad','calculator','explorer'],platform:'windows',version:'0.24.1',scopedFiles:true,initialLanguage:'"+lang+L"'});try{if(!localStorage.getItem('pongy_settings_ui'))localStorage.setItem('pongy_settings_ui',JSON.stringify({theme:'light',lang:'"+lang+L"',nickname:''}));}catch(e){}}";view->AddScriptToExecuteOnDocumentCreated(script.c_str(),nullptr);view->Navigate(site);return S_OK;}};
struct Environment:Handler<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler>{HRESULT STDMETHODCALLTYPE Invoke(HRESULT result,ICoreWebView2Environment* e)override{if(SUCCEEDED(result)&&e){auto ready=new Ready;e->CreateCoreWebView2Controller(mainWindow,ready);ready->Release();}else MessageBoxW(mainWindow,L"Microsoft Edge WebView2 Runtime is required. Install the official runtime from Microsoft and reopen Pongy AI.",L"Pongy AI",MB_OK|MB_ICONERROR);return S_OK;}};
static LRESULT CALLBACK proc(HWND w,UINT m,WPARAM a,LPARAM b){if(m==WM_SIZE&&controller){RECT r;GetClientRect(w,&r);controller->put_Bounds(r);}if(m==WM_DESTROY){if(controller){controller->Close();controller->Release();controller=nullptr;}if(view){view->Release();view=nullptr;}PostQuitMessage(0);return 0;}return DefWindowProcW(w,m,a,b);}
int WINAPI wWinMain(HINSTANCE instance,HINSTANCE,LPWSTR,int show){CoInitializeEx(nullptr,COINIT_APARTMENTTHREADED);SetProcessDPIAware();WNDCLASSW wc={};wc.lpfnWndProc=proc;wc.hInstance=instance;wc.lpszClassName=L"PongyAINative";wc.hIcon=LoadIconW(instance,MAKEINTRESOURCEW(1));wc.hCursor=LoadCursorW(nullptr,IDC_ARROW);wc.hbrBackground=(HBRUSH)(COLOR_WINDOW+1);RegisterClassW(&wc);mainWindow=CreateWindowW(wc.lpszClassName,L"Pongy AI",WS_OVERLAPPEDWINDOW,CW_USEDEFAULT,CW_USEDEFAULT,1180,820,nullptr,nullptr,instance,nullptr);ShowWindow(mainWindow,show);
 wchar_t executable[MAX_PATH];GetModuleFileNameW(nullptr,executable,MAX_PATH);std::wstring dll=executable;dll=dll.substr(0,dll.find_last_of(L"\\/")+1)+L"WebView2Loader.dll";HMODULE loader=LoadLibraryExW(dll.c_str(),nullptr,LOAD_LIBRARY_SEARCH_DLL_LOAD_DIR|LOAD_LIBRARY_SEARCH_SYSTEM32);using Create=HRESULT(STDAPICALLTYPE*)(PCWSTR,PCWSTR,ICoreWebView2EnvironmentOptions*,ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler*);auto create=loader?reinterpret_cast<Create>(GetProcAddress(loader,"CreateCoreWebView2EnvironmentWithOptions")):nullptr;if(!create){MessageBoxW(mainWindow,L"WebView2Loader.dll is missing. Reinstall Pongy AI.",L"Pongy AI",MB_OK|MB_ICONERROR);return 1;}PWSTR local=nullptr;SHGetKnownFolderPath(FOLDERID_LocalAppData,0,nullptr,&local);std::wstring profile=local?local:L".";CoTaskMemFree(local);profile+=L"\\Pongy AI\\WebViewProfile";auto handler=new Environment;HRESULT result=create(nullptr,profile.c_str(),nullptr,handler);handler->Release();if(FAILED(result))MessageBoxW(mainWindow,L"Unable to start WebView2. Install or repair the official WebView2 Runtime.",L"Pongy AI",MB_OK|MB_ICONERROR);MSG msg;while(GetMessageW(&msg,nullptr,0,0)>0){TranslateMessage(&msg);DispatchMessageW(&msg);}if(loader)FreeLibrary(loader);CoUninitialize();return 0;}
