#!/usr/bin/env python3
"""Add a bilingual, branded, native Windows Installer wizard to the built MSI.
Uses msibuild/msiinfo from msitools; source and generated IDT files are auditable.
No executable custom actions, network downloads, or elevated helper scripts.
"""
import csv,io,os,subprocess,sys,tempfile
from pathlib import Path
MSIBUILD=os.environ.get('MSIBUILD','msibuild')
MSIINFO=os.environ.get('MSIINFO','msiinfo')

def table(msi,name):
    raw=subprocess.check_output([MSIINFO,'export',str(msi),name]).decode('utf-8').replace('\x00','')
    rows=list(csv.reader(io.StringIO(raw),delimiter='\t'))
    return rows[:3],rows[3:]

def install(msi):
    msi=Path(msi).resolve()
    def write_table(folder,name,cols,types,keys,rows):
        target=Path(folder,name+'.idt')
        # Import text is UTF-8; the MSI string pool stores code page 1251.
        with target.open('w',encoding='utf-8',newline='') as out:
            writer=csv.writer(out,delimiter='\t',lineterminator='\r\n',quoting=csv.QUOTE_NONE,quotechar=None,escapechar=None)
            for row in [cols,types,[name]+keys]+rows:writer.writerow([str(x) for x in row])
        subprocess.run([MSIBUILD,str(msi),'-i',str(target)],check=True,cwd=folder)
    en={'SETUP_TITLE':'Pongy AI Setup','SETUP_WELCOME':'Install Pongy AI','SETUP_SUMMARY':'Choose your options, then click Install.','SETUP_CANCEL':'Cancel','SETUP_BACK':'Back','SETUP_INSTALL':'Install','SETUP_DESKTOP':'Create a desktop shortcut','SETUP_COMPLETE':'Setup completed','SETUP_COMPLETE_TEXT':'You can open Pongy AI from the Start menu. An Internet connection and WebView2 Runtime are required.','SETUP_CLOSE':'Close','SETUP_PROGRESS':'Installing Pongy AI','SETUP_PROGRESS_TEXT':'Please wait while the application files are installed.','SETUP_FAILED':'Setup could not finish','SETUP_FAILED_TEXT':'Installation did not complete. Close this window and try again.','SETUP_CANCELED':'Setup canceled','SETUP_CANCELED_TEXT':'The installation was canceled.','SETUP_REPAIR':'Repair','SETUP_REMOVE':'Uninstall','SETUP_MAINTENANCE':'Pongy AI is already installed','SETUP_MAINTENANCE_TEXT':'Repair the installation or remove the application. Your account is not deleted.'}
    ru=dict(zip(en,['Установка Pongy AI','Установка Pongy AI','Выберите параметры и нажмите «Установить».','Отмена','Назад','Установить','Создать ярлык на рабочем столе','Установка завершена','Pongy AI доступен в меню «Пуск». Для работы нужны интернет и WebView2 Runtime.','Закрыть','Установка Pongy AI','Подождите, пока устанавливаются файлы приложения.','Установка не завершена','Не удалось завершить установку. Закройте окно и повторите попытку.','Установка отменена','Установка была отменена.','Восстановить','Удалить','Pongy AI уже установлен','Восстановите или удалите приложение. Ваш аккаунт не удаляется.']))
    assert len(en)==len(ru)
    dialogs=[];controls=[];events=[]
    def dialog(name,title,first,default,cancel,modal=True):dialogs.append([name,50,50,500,330,3 if modal else 1,title,first,default,cancel])
    def control(d,name,kind,x,y,w,h,text='',prop='',next='',attrs=3):controls.append([d,name,kind,x,y,w,h,attrs,prop,text,next,''])
    def bg(d):control(d,'Background','Bitmap',0,0,175,330,'PongyBackground')
    def button(d,name,x,text,next=''):control(d,name,'PushButton',x,293,86,23,text,next=next)
    def event(d,c,name,arg,condition='1',order=1):events.append([d,c,name,arg,condition,order])
    dialog('LanguageDlg','Pongy AI · Setup / Установка','Language','Next','Cancel');bg('LanguageDlg')
    control('LanguageDlg','Title','Text',194,45,284,52,'{\\PongyTitle}Installation language / Язык установки')
    control('LanguageDlg','Hint','Text',194,111,280,38,'Choose your language. Выберите язык установки.')
    control('LanguageDlg','Language','ComboBox',194,162,270,22,prop='PONGYLANG',next='Next',attrs=131075)
    button('LanguageDlg','Next',300,'Next / Далее','Cancel');button('LanguageDlg','Cancel',394,'Cancel / Отмена','Language')
    for i,key in enumerate(en):
        event('LanguageDlg','Next','['+key+']',en[key],'PONGYLANG = "en"',i+1)
        event('LanguageDlg','Next','['+key+']',ru[key],'PONGYLANG = "ru"',i+1)
    event('LanguageDlg','Next','NewDialog','OptionsDlg','NOT Installed',100)
    event('LanguageDlg','Next','NewDialog','MaintenanceDlg','Installed',100)
    event('LanguageDlg','Cancel','EndDialog','Exit')
    dialog('OptionsDlg','[SETUP_TITLE]','Desktop','Install','Cancel');bg('OptionsDlg')
    control('OptionsDlg','Title','Text',194,45,280,48,'{\\PongyTitle}[SETUP_WELCOME]')
    control('OptionsDlg','Hint','Text',194,109,280,42,'[SETUP_SUMMARY]')
    control('OptionsDlg','Desktop','CheckBox',194,174,280,32,'[SETUP_DESKTOP]',prop='PONGYDESKTOP',next='Back')
    button('OptionsDlg','Back',206,'[SETUP_BACK]','Install');button('OptionsDlg','Install',300,'[SETUP_INSTALL]','Cancel');button('OptionsDlg','Cancel',394,'[SETUP_CANCEL]','Desktop')
    event('OptionsDlg','Back','NewDialog','LanguageDlg');event('OptionsDlg','Install','EndDialog','Return');event('OptionsDlg','Cancel','EndDialog','Exit')
    dialog('MaintenanceDlg','[SETUP_TITLE]','Repair','Repair','Cancel');bg('MaintenanceDlg')
    control('MaintenanceDlg','Title','Text',194,45,280,48,'{\\PongyTitle}[SETUP_MAINTENANCE]')
    control('MaintenanceDlg','Hint','Text',194,109,280,68,'[SETUP_MAINTENANCE_TEXT]')
    button('MaintenanceDlg','Repair',206,'[SETUP_REPAIR]','Remove');button('MaintenanceDlg','Remove',300,'[SETUP_REMOVE]','Cancel');button('MaintenanceDlg','Cancel',394,'[SETUP_CANCEL]','Repair')
    for key,value in [('REINSTALL','ALL'),('REINSTALLMODE','amus')]:event('MaintenanceDlg','Repair','['+key+']',value,order=1 if key=='REINSTALL' else 2)
    event('MaintenanceDlg','Repair','EndDialog','Return',order=3);event('MaintenanceDlg','Remove','[REMOVE]','ALL');event('MaintenanceDlg','Remove','EndDialog','Return',order=2);event('MaintenanceDlg','Cancel','EndDialog','Exit')
    dialog('ProgressDlg','[SETUP_TITLE]','','','',False);bg('ProgressDlg')
    control('ProgressDlg','Title','Text',194,45,280,52,'{\\PongyTitle}[SETUP_PROGRESS]')
    control('ProgressDlg','Hint','Text',194,117,280,55,'[SETUP_PROGRESS_TEXT]')
    control('ProgressDlg','Progress','ProgressBar',194,195,280,16,attrs=65539)
    for name,title,text in [('CompleteDlg','SETUP_COMPLETE','SETUP_COMPLETE_TEXT'),('FailedDlg','SETUP_FAILED','SETUP_FAILED_TEXT'),('CanceledDlg','SETUP_CANCELED','SETUP_CANCELED_TEXT')]:
        dialog(name,'[SETUP_TITLE]','Close','Close','Close');bg(name)
        control(name,'Title','Text',194,45,280,52,'{\\PongyTitle}['+title+']')
        control(name,'Hint','Text',194,117,280,90,'['+text+']')
        button(name,'Close',394,'[SETUP_CLOSE]','Close');event(name,'Close','EndDialog','Return')
    with tempfile.TemporaryDirectory(prefix='pongy-msi-ui-') as folder:
        # Importing a force-codepage IDT is the official MSI string-pool conversion mechanism.
        cp=Path(folder,'codepage.idt');cp.write_bytes(b'\r\n\r\n1251\t_ForceCodepage\r\n');subprocess.run([MSIBUILD,str(msi),'-i',str(cp)],check=True)
        hdr,rows=table(msi,'Property');props=dict(rows);props.update(en);props['DefaultUIFont']='PongyNormal';props['ARPNOMODIFY']='1';props['SecureCustomProperties']=';'.join(sorted(set((props.get('SecureCustomProperties','')+';PONGYLANG;PONGYDESKTOP').split(';'))-set([''])))
        write_table(folder,'Property',hdr[0],hdr[1],hdr[2][1:],list(props.items()))
        hdr,components=table(msi,'Component')
        for row in components:
            if row[0]=='DesktopShortcut':row[4]='PONGYDESKTOP = \"1\"';row[3]=str(int(row[3])|64)
        write_table(folder,'Component',hdr[0],hdr[1],hdr[2][1:],components)
        write_table(folder,'Dialog',['Dialog','HCentering','VCentering','Width','Height','Attributes','Title','Control_First','Control_Default','Control_Cancel'],['s72','i2','i2','i2','i2','i4','L128','S50','S50','S50'],['Dialog'],dialogs)
        write_table(folder,'Control',['Dialog_','Control','Type','X','Y','Width','Height','Attributes','Property','Text','Control_Next','Help'],['s72','s50','s20','i2','i2','i2','i2','I4','S72','L0','S50','L50'],['Dialog_','Control'],controls)
        write_table(folder,'ControlEvent',['Dialog_','Control_','Event','Argument','Condition','Ordering'],['s72','s50','s50','L255','S255','I2'],['Dialog_','Control_','Event','Argument','Condition'],events)
        write_table(folder,'ComboBox',['Property','Order','Value','Text'],['s72','i2','s64','L64'],['Property','Order'],[['PONGYLANG',1,'en','English'],['PONGYLANG',2,'ru','Русский']])
        write_table(folder,'CheckBox',['Property','Value'],['s72','S64'],['Property'],[['PONGYDESKTOP','1']])
        write_table(folder,'TextStyle',['TextStyle','FaceName','Size','Color','StyleBits'],['s72','L32','i2','I4','I2'],['TextStyle'],[['PongyNormal','Segoe UI',10,3420978,0],['PongyTitle','Segoe UI',17,3420978,1]])
        write_table(folder,'EventMapping',['Dialog_','Control_','Event','Attribute'],['s72','s50','s50','s50'],['Dialog_','Control_','Event'],[['ProgressDlg','Progress','SetProgress','Progress']])
        hdr,seq=table(msi,'InstallUISequence');seq=[r for r in seq if r[0] not in ['LanguageDlg','ProgressDlg','CompleteDlg','CanceledDlg','FailedDlg']];seq.extend([['LanguageDlg','NOT (REMOVE = "ALL")',1100],['ProgressDlg','1',1290],['CompleteDlg','1',-1],['CanceledDlg','1',-2],['FailedDlg','1',-3]])
        write_table(folder,'InstallUISequence',hdr[0],hdr[1],hdr[2][1:],seq)
    # Round-trip checks catch encoding damage and missing condition/property links.
    _,props=table(msi,'Property');assert dict(props)['PONGYDESKTOP']=='1'
    _,combo=table(msi,'ComboBox');assert ['PONGYLANG','2','ru','Русский'] in combo
    _,published=table(msi,'ControlEvent');assert any(r[3]=='Создать ярлык на рабочем столе' for r in published)
    _,registry=table(msi,'Registry');assert any(r[3]=='InitialLanguage' and r[4]=='[PONGYLANG]' for r in registry)
    _,components=table(msi,'Component');assert any(r[0]=='DesktopShortcut' and r[4]=='PONGYDESKTOP = "1"' for r in components)
    print('Branded MSI wizard added and table round-trip checks passed.')
if __name__=='__main__':
    if len(sys.argv)!=2:raise SystemExit('usage: installer-ui.py package.msi')
    install(sys.argv[1])
