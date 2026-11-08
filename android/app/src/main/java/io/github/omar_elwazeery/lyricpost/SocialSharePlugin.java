package io.github.omar_elwazeery.lyricpost;

import android.Manifest;
import android.content.ClipData;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Saves the exported image to the Gallery and shares it straight to a chosen app.
 *
 * Methods (all take "path": the file:// URI of a PNG in the app's cache):
 *  - saveToGallery({ path, fileName })      -> { uri }
 *  - listTargets()                          -> { targets: [{ packageName, activityName, appName, label, icon, social }] }
 *  - shareTo({ path, packageName, activityName })
 */
@CapacitorPlugin(
    name = "SocialShare",
    permissions = {
        @Permission(strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE }, alias = "storage")
    }
)
public class SocialSharePlugin extends Plugin {

    private static final String ALBUM = "LyricPost";
    private static final String MIME = "image/png";

    /** Apps listed first, in this order. Anything else that accepts images comes after. */
    private static final List<String> SOCIAL_PACKAGES = Arrays.asList(
        "com.instagram.android",
        "com.whatsapp",
        "com.whatsapp.w4b",
        "com.facebook.katana",
        "com.facebook.lite",
        "com.facebook.orca",
        "com.facebook.mlite",
        "com.snapchat.android",
        "com.zhiliaoapp.musically",
        "com.ss.android.ugc.trill",
        "com.instagram.barcelona",
        "com.twitter.android",
        "org.telegram.messenger",
        "org.telegram.messenger.web",
        "org.thunderdog.challegram",
        "com.pinterest",
        "com.discord",
        "com.reddit.frontpage",
        "com.linkedin.android",
        "com.tumblr",
        "com.bereal.ft",
        "com.vkontakte.android",
        "jp.naver.line.android",
        "com.viber.voip",
        "com.kakao.talk",
        "com.tencent.mm",
        "org.thoughtcrime.securesms",
        "com.bsky.app",
        "org.joinmastodon.android"
    );

    // ---------------------------------------------------------------- Gallery

    @PluginMethod
    public void saveToGallery(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q
                && getPermissionState("storage") != PermissionState.GRANTED) {
            requestPermissionForAlias("storage", call, "storagePermissionCallback");
            return;
        }
        doSaveToGallery(call);
    }

    @PermissionCallback
    private void storagePermissionCallback(PluginCall call) {
        if (getPermissionState("storage") == PermissionState.GRANTED) {
            doSaveToGallery(call);
        } else {
            call.reject("Storage permission is needed to save to the Gallery");
        }
    }

    private void doSaveToGallery(PluginCall call) {
        File source = fileFromCall(call);
        if (source == null) return;

        String fileName = call.getString("fileName", source.getName());
        Context context = getContext();

        try {
            Uri saved;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentResolver resolver = context.getContentResolver();
                ContentValues values = new ContentValues();
                values.put(MediaStore.Images.Media.DISPLAY_NAME, fileName);
                values.put(MediaStore.Images.Media.MIME_TYPE, MIME);
                values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/" + ALBUM);
                values.put(MediaStore.Images.Media.IS_PENDING, 1);

                saved = resolver.insert(
                    MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY), values);
                if (saved == null) throw new Exception("MediaStore refused the image");

                try (InputStream in = new FileInputStream(source);
                     OutputStream out = resolver.openOutputStream(saved)) {
                    copy(in, out);
                }
                values.clear();
                values.put(MediaStore.Images.Media.IS_PENDING, 0);
                resolver.update(saved, values, null, null);
            } else {
                File dir = new File(
                    Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), ALBUM);
                if (!dir.exists() && !dir.mkdirs()) throw new Exception("Could not create Pictures/" + ALBUM);
                File target = uniqueFile(dir, fileName);
                try (InputStream in = new FileInputStream(source);
                     OutputStream out = new java.io.FileOutputStream(target)) {
                    copy(in, out);
                }
                MediaScannerConnection.scanFile(context, new String[] { target.getAbsolutePath() },
                    new String[] { MIME }, null);
                saved = Uri.fromFile(target);
            }

            JSObject result = new JSObject();
            result.put("uri", saved.toString());
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Could not save to the Gallery: " + e.getMessage(), e);
        }
    }

    // ---------------------------------------------------------------- Share targets

    @PluginMethod
    public void listTargets(PluginCall call) {
        Context context = getContext();
        PackageManager pm = context.getPackageManager();
        Intent probe = new Intent(Intent.ACTION_SEND).setType(MIME);

        List<ResolveInfo> infos = pm.queryIntentActivities(probe, 0);
        List<JSObject> social = new ArrayList<>();
        List<JSObject> others = new ArrayList<>();
        Set<String> seen = new HashSet<>();

        for (ResolveInfo info : infos) {
            if (info.activityInfo == null) continue;
            String pkg = info.activityInfo.packageName;
            String activity = info.activityInfo.name;
            if (pkg.equals(context.getPackageName()) || !seen.add(pkg + "/" + activity)) continue;

            String appName = String.valueOf(info.activityInfo.applicationInfo.loadLabel(pm));
            String label = String.valueOf(info.loadLabel(pm));

            JSObject target = new JSObject();
            target.put("packageName", pkg);
            target.put("activityName", activity);
            target.put("appName", appName);
            target.put("label", label);
            target.put("icon", iconDataUrl(info.loadIcon(pm)));
            target.put("social", SOCIAL_PACKAGES.contains(pkg));
            (SOCIAL_PACKAGES.contains(pkg) ? social : others).add(target);
        }

        social.sort((a, b) -> Integer.compare(
            SOCIAL_PACKAGES.indexOf(a.getString("packageName")),
            SOCIAL_PACKAGES.indexOf(b.getString("packageName"))));
        others.sort((a, b) -> a.getString("appName").compareToIgnoreCase(b.getString("appName")));

        JSArray all = new JSArray();
        for (JSObject t : social) all.put(t);
        for (JSObject t : others) all.put(t);

        JSObject result = new JSObject();
        result.put("targets", all);
        call.resolve(result);
    }

    @PluginMethod
    public void shareTo(PluginCall call) {
        File source = fileFromCall(call);
        if (source == null) return;

        String pkg = call.getString("packageName");
        String activity = call.getString("activityName");
        if (pkg == null || activity == null) {
            call.reject("packageName and activityName are required");
            return;
        }

        try {
            Context context = getContext();
            Uri uri = FileProvider.getUriForFile(context, context.getPackageName() + ".fileprovider", source);

            Intent intent = new Intent(Intent.ACTION_SEND);
            intent.setType(MIME);
            intent.putExtra(Intent.EXTRA_STREAM, uri);
            intent.setClipData(ClipData.newRawUri("", uri));
            intent.setClassName(pkg, activity);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);

            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open that app: " + e.getMessage(), e);
        }
    }

    // ---------------------------------------------------------------- Helpers

    private File fileFromCall(PluginCall call) {
        String path = call.getString("path");
        if (path == null) {
            call.reject("path is required");
            return null;
        }
        File file = new File(Uri.parse(path).getPath());
        if (!file.exists()) {
            call.reject("File not found: " + path);
            return null;
        }
        return file;
    }

    private static String iconDataUrl(Drawable drawable) {
        int size = 144;
        Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        drawable.setBounds(0, 0, size, size);
        drawable.draw(canvas);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, out);
        bitmap.recycle();
        return "data:image/png;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
    }

    private static File uniqueFile(File dir, String fileName) {
        File file = new File(dir, fileName);
        String base = fileName.replaceFirst("\\.png$", "");
        for (int i = 1; file.exists(); i++) {
            file = new File(dir, base + " (" + i + ").png");
        }
        return file;
    }

    private static void copy(InputStream in, OutputStream out) throws java.io.IOException {
        byte[] buffer = new byte[64 * 1024];
        int read;
        while ((read = in.read(buffer)) != -1) out.write(buffer, 0, read);
    }
}
