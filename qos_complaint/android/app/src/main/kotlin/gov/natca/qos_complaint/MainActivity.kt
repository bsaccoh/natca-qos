package gov.natca.qos_complaint

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.telephony.CellInfoGsm
import android.telephony.CellInfoLte
import android.telephony.CellInfoWcdma
import android.telephony.CellInfoNr
import android.telephony.TelephonyManager
import androidx.core.app.ActivityCompat
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.natca.qoe/cell_info"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)
            .setMethodCallHandler { call, result ->
                if (call.method == "getCellInfo") {
                    result.success(getCellInfo())
                } else {
                    result.notImplemented()
                }
            }
    }

    private fun getCellInfo(): Map<String, Any?> {
        val info = mutableMapOf<String, Any?>()
        val tm = getSystemService(TELEPHONY_SERVICE) as? TelephonyManager ?: return info

        info["carrier"] = tm.networkOperatorName?.takeIf { it.isNotEmpty() }

        val networkOp = tm.networkOperator
        if (networkOp != null && networkOp.length >= 5) {
            info["mcc"] = networkOp.substring(0, 3)
            info["mnc"] = networkOp.substring(3)
        }

        try {
            info["radioType"] = when (tm.dataNetworkType) {
                TelephonyManager.NETWORK_TYPE_GPRS,
                TelephonyManager.NETWORK_TYPE_EDGE,
                TelephonyManager.NETWORK_TYPE_CDMA -> "2G"
                TelephonyManager.NETWORK_TYPE_UMTS,
                TelephonyManager.NETWORK_TYPE_HSDPA,
                TelephonyManager.NETWORK_TYPE_HSUPA,
                TelephonyManager.NETWORK_TYPE_HSPA,
                TelephonyManager.NETWORK_TYPE_HSPAP -> "3G"
                TelephonyManager.NETWORK_TYPE_LTE -> "4G/LTE"
                TelephonyManager.NETWORK_TYPE_NR -> "5G/NR"
                else -> null
            }
        } catch (_: SecurityException) {
            // READ_PHONE_STATE not granted at runtime on Android 30+
        }

        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
            == PackageManager.PERMISSION_GRANTED
        ) {
            try {
                val cellInfoList = tm.allCellInfo
                if (cellInfoList != null && cellInfoList.isNotEmpty()) {
                    val cell = cellInfoList.firstOrNull { it.isRegistered } ?: cellInfoList[0]
                    when (cell) {
                        is CellInfoLte -> {
                            val identity = cell.cellIdentity
                            info["cellId"] = identity.ci.takeIf { it != Int.MAX_VALUE }
                            info["lac"] = identity.tac.takeIf { it != Int.MAX_VALUE }
                            info["signalStrength"] = cell.cellSignalStrength.dbm
                        }
                        is CellInfoGsm -> {
                            val identity = cell.cellIdentity
                            info["cellId"] = identity.cid.takeIf { it != Int.MAX_VALUE }
                            info["lac"] = identity.lac.takeIf { it != Int.MAX_VALUE }
                            info["signalStrength"] = cell.cellSignalStrength.dbm
                        }
                        is CellInfoWcdma -> {
                            val identity = cell.cellIdentity
                            info["cellId"] = identity.cid.takeIf { it != Int.MAX_VALUE }
                            info["lac"] = identity.lac.takeIf { it != Int.MAX_VALUE }
                            info["signalStrength"] = cell.cellSignalStrength.dbm
                        }
                    }
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && cell is CellInfoNr) {
                        info["signalStrength"] = cell.cellSignalStrength.dbm
                    }
                }
            } catch (_: Exception) {
                // Cell info not available
            }
        }

        return info
    }
}
