// Only capabilities issued by the server can reach these narrow Windows operations.
#include <winhttp.h>
#include <wbemidl.h>
#include <algorithm>
#include <thread>
static ICoreWebView2Environment* smartEnvironment=nullptr;
static HWND smartWindow=nullptr,paymentWindow=nullptr;
static ICoreWebView2Controller *smartController=nullptr,*paymentController=nullptr;
static ICoreWebView2 *smartView=nullptr,*paymentView=nullptr;
static bool smartConsent=false;
static unsigned long smartGeneration=0,smartJobSequence=0,smartActiveJob=0;
struct SmartCompletion {HWND target;unsigned long generation,job;std::string command;};
static NOTIFYICONDATAW smartTray={};
static void openSmartWindow();
static void openPaymentWindow(const std::wstring& url);
static void stopSmartHost();
static std::wstring nativeScript();
static bool ruHost(){return initialLanguage()==L"ru";}
static void smartResult(ICoreWebView2* target,const char* type,bool ok,const char* code=""){
 std::string s="{\"type\":\""+std::string(type)+"\",\"ok\":"+(ok?"true":"false")+",\"code\":\""+code+"\"}";
 std::wstring w(s.begin(),s.end());target->PostWebMessageAsJson(w.c_str());
}
static std::string verifySmartLease(const std::wstring& lease){
 if(lease.size()!=64||lease.find_first_not_of(L"0123456789abcdef")!=std::wstring::npos)return "";
 // This host is a build-time constant, never a webpage-supplied URL.
 #ifndef PONGY_SMART_API_HOST
 #define PONGY_SMART_API_HOST L"pongy-server.onrender.com"
 #endif
 HINTERNET session=WinHttpOpen(L"PongySmartPC/0.27.0",WINHTTP_ACCESS_TYPE_AUTOMATIC_PROXY,WINHTTP_NO_PROXY_NAME,WINHTTP_NO_PROXY_BYPASS,0);if(!session)return "";
 WinHttpSetTimeouts(session,3000,3000,3000,5000);
 HINTERNET connection=WinHttpConnect(session,PONGY_SMART_API_HOST,INTERNET_DEFAULT_HTTPS_PORT,0);
 HINTERNET request=connection?WinHttpOpenRequest(connection,L"POST",L"/api/smart-pc/verify",nullptr,WINHTTP_NO_REFERER,WINHTTP_DEFAULT_ACCEPT_TYPES,WINHTTP_FLAG_SECURE):nullptr;
 std::string result,body="{\"lease\":\""+std::string(lease.begin(),lease.end())+"\"}";
 if(request){DWORD redirect=WINHTTP_OPTION_REDIRECT_POLICY_NEVER;WinHttpSetOption(request,WINHTTP_OPTION_REDIRECT_POLICY,&redirect,sizeof(redirect));
  if(WinHttpSendRequest(request,L"Content-Type: application/json\r\n",DWORD(-1),body.data(),DWORD(body.size()),DWORD(body.size()),0)&&WinHttpReceiveResponse(request,nullptr)){
   DWORD status=0,size=sizeof(status);WinHttpQueryHeaders(request,WINHTTP_QUERY_STATUS_CODE|WINHTTP_QUERY_FLAG_NUMBER,WINHTTP_HEADER_NAME_BY_INDEX,&status,&size,WINHTTP_NO_HEADER_INDEX);
   if(status==200){char buffer[512];DWORD n=0;while(WinHttpReadData(request,buffer,sizeof(buffer),&n)&&n){result.append(buffer,n);if(result.size()>1024){result.clear();break;}}}
  }WinHttpCloseHandle(request);
 }if(connection)WinHttpCloseHandle(connection);WinHttpCloseHandle(session);return result;
}
static bool smartBrightness(bool up){
 IWbemLocator* locator=nullptr;IWbemServices* service=nullptr;IEnumWbemClassObject* rows=nullptr;IWbemClassObject *row=nullptr,*methodClass=nullptr,*inputType=nullptr,*input=nullptr,*result=nullptr;bool ok=false;BSTR ns=SysAllocString(L"ROOT\\WMI"),language=SysAllocString(L"WQL"),query=SysAllocString(L"SELECT * FROM WmiMonitorBrightness WHERE Active=TRUE");
 HRESULT hr=CoCreateInstance(CLSID_WbemLocator,nullptr,CLSCTX_INPROC_SERVER,IID_IWbemLocator,reinterpret_cast<void**>(&locator));
 if(SUCCEEDED(hr))hr=locator->ConnectServer(ns,nullptr,nullptr,nullptr,0,nullptr,nullptr,&service);
 if(SUCCEEDED(hr))hr=CoSetProxyBlanket(service,RPC_C_AUTHN_WINNT,RPC_C_AUTHZ_NONE,nullptr,RPC_C_AUTHN_LEVEL_CALL,RPC_C_IMP_LEVEL_IMPERSONATE,nullptr,EOAC_NONE);
 ULONG count=0;VARIANT brightness;VariantInit(&brightness);
 if(SUCCEEDED(hr))hr=service->ExecQuery(language,query,WBEM_FLAG_FORWARD_ONLY|WBEM_FLAG_RETURN_IMMEDIATELY,nullptr,&rows);
 if(SUCCEEDED(hr))hr=rows->Next(2000,1,&row,&count);if(SUCCEEDED(hr)&&count)hr=row->Get(L"CurrentBrightness",0,&brightness,nullptr,nullptr);else hr=E_FAIL;
 int current=brightness.vt==VT_UI1?brightness.bVal:brightness.vt==VT_I4?brightness.lVal:-1;VariantClear(&brightness);if(row){row->Release();row=nullptr;}if(rows){rows->Release();rows=nullptr;}
 SysFreeString(query);query=SysAllocString(L"SELECT * FROM WmiMonitorBrightnessMethods WHERE Active=TRUE");
 if(SUCCEEDED(hr)&&current>=0)hr=service->ExecQuery(language,query,WBEM_FLAG_FORWARD_ONLY|WBEM_FLAG_RETURN_IMMEDIATELY,nullptr,&rows);else hr=E_FAIL;
 if(SUCCEEDED(hr))hr=rows->Next(2000,1,&row,&count);VARIANT objectPath;VariantInit(&objectPath);if(SUCCEEDED(hr)&&count)hr=row->Get(L"__PATH",0,&objectPath,nullptr,nullptr);else hr=E_FAIL;
 BSTR cls=SysAllocString(L"WmiMonitorBrightnessMethods"),method=SysAllocString(L"WmiSetBrightness");
 if(SUCCEEDED(hr))hr=service->GetObject(cls,0,nullptr,&methodClass,nullptr);if(SUCCEEDED(hr))hr=methodClass->GetMethod(method,0,&inputType,nullptr);if(SUCCEEDED(hr))hr=inputType->SpawnInstance(0,&input);
 VARIANT timeout,value;VariantInit(&timeout);VariantInit(&value);timeout.vt=VT_I4;timeout.lVal=0;value.vt=VT_UI1;value.bVal=BYTE(std::max(0,std::min(100,current+(up?10:-10))));
 if(SUCCEEDED(hr))hr=input->Put(L"Timeout",0,&timeout,0);if(SUCCEEDED(hr))hr=input->Put(L"Brightness",0,&value,0);if(SUCCEEDED(hr)&&objectPath.vt==VT_BSTR)hr=service->ExecMethod(objectPath.bstrVal,method,0,nullptr,input,&result,nullptr);
 if(SUCCEEDED(hr)&&result){VARIANT returned;VariantInit(&returned);if(SUCCEEDED(result->Get(L"ReturnValue",0,&returned,nullptr,nullptr)))ok=(returned.vt==VT_I4&&returned.lVal==0)||(returned.vt==VT_UI4&&returned.ulVal==0);VariantClear(&returned);}
 VariantClear(&objectPath);SysFreeString(cls);SysFreeString(method);SysFreeString(ns);SysFreeString(language);SysFreeString(query);
 if(result)result->Release();if(input)input->Release();if(inputType)inputType->Release();if(methodClass)methodClass->Release();if(row)row->Release();if(rows)rows->Release();if(service)service->Release();if(locator)locator->Release();return ok;
}
static bool executeSmart(const std::string& command){
 if(command=="pongy-smart-v1\nvolume\nup"||command=="pongy-smart-v1\nvolume\ndown"||command=="pongy-smart-v1\nvolume\nmute"){
  WORD key=command.find("\nup")!=std::string::npos?VK_VOLUME_UP:command.find("\ndown")!=std::string::npos?VK_VOLUME_DOWN:VK_VOLUME_MUTE;INPUT input[2]={};input[0].type=input[1].type=INPUT_KEYBOARD;input[0].ki.wVk=input[1].ki.wVk=key;input[1].ki.dwFlags=KEYEVENTF_KEYUP;return SendInput(2,input,sizeof(INPUT))==2;
 }
 if(command=="pongy-smart-v1\nbrightness\nup"||command=="pongy-smart-v1\nbrightness\ndown")return smartBrightness(command.find("\nup")!=std::string::npos);
 std::wstring path;wchar_t directory[MAX_PATH]={};
 if(command=="pongy-smart-v1\nopen\nyoutube")path=L"https://www.youtube.com/";
 else if(command=="pongy-smart-v1\nopen\nmax"){
  wchar_t app[MAX_PATH]={};DWORD size=sizeof(app);bool found=RegGetValueW(HKEY_CURRENT_USER,L"Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\MAX.exe",nullptr,RRF_RT_REG_SZ,nullptr,app,&size)==ERROR_SUCCESS;
  if(!found){size=sizeof(app);found=RegGetValueW(HKEY_LOCAL_MACHINE,L"Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\MAX.exe",nullptr,RRF_RT_REG_SZ,nullptr,app,&size)==ERROR_SUCCESS;}
  path=found&&GetFileAttributesW(app)!=INVALID_FILE_ATTRIBUTES?app:L"https://web.max.ru/";
 }else if(command=="pongy-smart-v1\nopen\nnotepad"){GetSystemDirectoryW(directory,MAX_PATH);path=std::wstring(directory)+L"\\notepad.exe";}
 else if(command=="pongy-smart-v1\nopen\ncalculator"){GetSystemDirectoryW(directory,MAX_PATH);path=std::wstring(directory)+L"\\calc.exe";}
 else if(command=="pongy-smart-v1\nopen\nexplorer"){GetWindowsDirectoryW(directory,MAX_PATH);path=std::wstring(directory)+L"\\explorer.exe";}
 else return false;
 return reinterpret_cast<INT_PTR>(ShellExecuteW(smartWindow,L"open",path.c_str(),nullptr,nullptr,SW_SHOWNORMAL))>32;
}
