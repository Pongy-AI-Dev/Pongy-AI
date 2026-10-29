// Dedicated WebViews: the payment provider receives NO native bridge.
static void stopSmartHost(){smartConsent=false;++smartGeneration;smartActiveJob=0;if(smartView)smartView->PostWebMessageAsJson(L"{\"type\":\"smart-stop\"}");}
static LRESULT CALLBACK smartProc(HWND w,UINT m,WPARAM a,LPARAM b){
 if(m==WM_SIZE&&smartController){RECT r;GetClientRect(w,&r);smartController->put_Bounds(r);}
 if(m==WM_CLOSE){DestroyWindow(w);return 0;}
 if(m==WM_DESTROY){smartConsent=false;++smartGeneration;smartActiveJob=0;if(smartController){smartController->Close();smartController->Release();smartController=nullptr;}if(smartView){smartView->Release();smartView=nullptr;}smartWindow=nullptr;if(view)view->PostWebMessageAsJson(L"{\"type\":\"smart-panel\",\"open\":false}");return 0;}
 return DefWindowProcW(w,m,a,b);
}
struct SmartReady:Handler<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler>{HRESULT STDMETHODCALLTYPE Invoke(HRESULT result,ICoreWebView2Controller* c)override{
 if(FAILED(result)||!c||!smartWindow)return S_OK;smartController=c;c->AddRef();c->get_CoreWebView2(&smartView);RECT r;GetClientRect(smartWindow,&r);c->put_Bounds(r);
 ICoreWebView2Settings* settings=nullptr;smartView->get_Settings(&settings);if(settings){settings->put_AreHostObjectsAllowed(FALSE);settings->Release();}
 EventRegistrationToken token;auto message=new DesktopMessage;smartView->add_WebMessageReceived(message,&token);message->Release();auto navigation=new Navigation;smartView->add_NavigationStarting(navigation,&token);navigation->Release();auto popup=new Popup;smartView->add_NewWindowRequested(popup,&token);popup->Release();std::wstring script=nativeScript();smartView->AddScriptToExecuteOnDocumentCreated(script.c_str(),nullptr);smartView->Navigate(L"https://pongy-ai.devs.surf/smart-pc.html");return S_OK;
}};
static void openSmartWindow(){
 if(smartWindow){ShowWindow(smartWindow,SW_RESTORE);SetForegroundWindow(smartWindow);return;}if(!smartEnvironment)return;
 WNDCLASSW wc={};wc.lpfnWndProc=smartProc;wc.hInstance=GetModuleHandleW(nullptr);wc.lpszClassName=L"PongySmartPC";wc.hIcon=LoadIconW(wc.hInstance,MAKEINTRESOURCEW(1));wc.hCursor=LoadCursorW(nullptr,IDC_ARROW);wc.hbrBackground=(HBRUSH)(COLOR_WINDOW+1);RegisterClassW(&wc);
 RECT work;SystemParametersInfoW(SPI_GETWORKAREA,0,&work,0);UINT dpi=GetDpiForWindow(mainWindow);int width=MulDiv(352,dpi?dpi:96,96),height=MulDiv(540,dpi?dpi:96,96);width=std::min(width,int(work.right-work.left));height=std::min(height,int(work.bottom-work.top));
 smartWindow=CreateWindowExW(WS_EX_TOOLWINDOW,wc.lpszClassName,L"Pongy Smart PC",WS_OVERLAPPED|WS_CAPTION|WS_SYSMENU|WS_MINIMIZEBOX,work.right-width-12,work.bottom-height-12,width,height,mainWindow,nullptr,wc.hInstance,nullptr);if(!smartWindow)return;
 ShowWindow(smartWindow,SW_SHOW);if(view)view->PostWebMessageAsJson(L"{\"type\":\"smart-panel\",\"open\":true}");auto ready=new SmartReady;smartEnvironment->CreateCoreWebView2Controller(smartWindow,ready);ready->Release();
}
static LRESULT CALLBACK paymentProc(HWND w,UINT m,WPARAM a,LPARAM b){
 if(m==WM_SIZE&&paymentController){RECT r;GetClientRect(w,&r);paymentController->put_Bounds(r);}
 if(m==WM_DESTROY){if(paymentController){paymentController->Close();paymentController->Release();paymentController=nullptr;}if(paymentView){paymentView->Release();paymentView=nullptr;}paymentWindow=nullptr;return 0;}return DefWindowProcW(w,m,a,b);
}
struct PaymentNavigation:Handler<ICoreWebView2NavigationStartingEventHandler>{HRESULT STDMETHODCALLTYPE Invoke(ICoreWebView2*,ICoreWebView2NavigationStartingEventArgs* args)override{
 LPWSTR uri=nullptr;args->get_Uri(&uri);std::wstring s=uri?uri:L"";CoTaskMemFree(uri);if(trusted(s.c_str())){args->put_Cancel(TRUE);if(paymentWindow)PostMessageW(paymentWindow,WM_CLOSE,0,0);return S_OK;}if(s.rfind(L"https://",0)!=0)args->put_Cancel(TRUE);return S_OK;
}};
struct PaymentReady:Handler<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler>{std::wstring url;explicit PaymentReady(std::wstring u):url(std::move(u)){}HRESULT STDMETHODCALLTYPE Invoke(HRESULT result,ICoreWebView2Controller* c)override{
 if(FAILED(result)||!c||!paymentWindow)return S_OK;paymentController=c;c->AddRef();c->get_CoreWebView2(&paymentView);RECT r;GetClientRect(paymentWindow,&r);c->put_Bounds(r);ICoreWebView2Settings* settings=nullptr;paymentView->get_Settings(&settings);if(settings){settings->put_AreHostObjectsAllowed(FALSE);settings->put_IsWebMessageEnabled(FALSE);settings->Release();}EventRegistrationToken token;auto nav=new PaymentNavigation;paymentView->add_NavigationStarting(nav,&token);nav->Release();auto popup=new Popup;paymentView->add_NewWindowRequested(popup,&token);popup->Release();paymentView->Navigate(url.c_str());return S_OK;
}};
static void openPaymentWindow(const std::wstring& url){
 if(url.size()>2048||!(url.rfind(L"https://checkout.stripe.com/",0)==0||url.rfind(L"https://yookassa.ru/",0)==0||url.rfind(L"https://yoomoney.ru/",0)==0))return;
 if(paymentWindow){SetForegroundWindow(paymentWindow);return;}if(!smartEnvironment)return;
 WNDCLASSW wc={};wc.lpfnWndProc=paymentProc;wc.hInstance=GetModuleHandleW(nullptr);wc.lpszClassName=L"PongyCheckout";wc.hCursor=LoadCursorW(nullptr,IDC_ARROW);wc.hbrBackground=(HBRUSH)(COLOR_WINDOW+1);RegisterClassW(&wc);paymentWindow=CreateWindowW(wc.lpszClassName,ruHost()?L"Pongy — оплата подписки":L"Pongy — subscription checkout",WS_OVERLAPPEDWINDOW,CW_USEDEFAULT,CW_USEDEFAULT,520,740,mainWindow,nullptr,wc.hInstance,nullptr);if(!paymentWindow)return;ShowWindow(paymentWindow,SW_SHOW);auto ready=new PaymentReady(url);smartEnvironment->CreateCoreWebView2Controller(paymentWindow,ready);ready->Release();
}
