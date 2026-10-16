package dev.pongy.app;
import android.app.Activity;
import android.app.AlertDialog;
import android.os.Bundle;
import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.net.Uri;
public final class MainActivity extends Activity {
 @Override public void onCreate(Bundle state) {
  super.onCreate(state);
  Uri site=Uri.parse("https://pongy-ai.devs.surf/?pongy_app=android&client_version=0.15.0");
  Intent browser=new Intent(Intent.ACTION_VIEW,site);
  browser.addCategory(Intent.CATEGORY_BROWSABLE);
  // Custom Tabs use the browser's renderer, cookies, permissions and Google sign-in.
  // There is no JavaScript bridge, embedded credential form or native file access.
  Bundle extras=new Bundle();extras.putBinder("android.support.customtabs.extra.SESSION",null);
  browser.putExtras(extras);
  browser.putExtra("android.support.customtabs.extra.TITLE_VISIBILITY",1);
  browser.putExtra("android.support.customtabs.extra.ENABLE_URLBAR_HIDING",true);
  browser.putExtra("android.support.customtabs.extra.TOOLBAR_COLOR",0xff1e2432);
  try {startActivity(browser);finish();}
  catch(ActivityNotFoundException error) {
   new AlertDialog.Builder(this).setTitle("Pongy AI")
    .setMessage("A supported web browser is required. Install or enable a browser, then open Pongy AI again.")
    .setPositiveButton(android.R.string.ok,(dialog,which)->finish()).setOnCancelListener(dialog->finish()).show();
  }
 }
}
