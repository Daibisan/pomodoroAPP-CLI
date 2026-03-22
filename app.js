const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const readline = require("readline-sync");

const mpvPath = "C:\\Program Files\\MPV Player\\mpv.com";

// ==========================================
// CONFIGURATION
// ==========================================
const FOCUS_TIME = 25 * 60;
const REST_TIME = 5 * 60;
const VOL_NOTIF = 55;
const VOL_MUSIK = 70;
// ==========================================

let daftarTujuan = [];
const soundSelesaiFokus = path.join(__dirname, "sound", "focus_end.mp3");
const soundMulaiFokus = path.join(__dirname, "sound", "focus_start.mp3");
const soundIstirahat = path.join(__dirname, "sound", "break.mp3");
const gifIstirahat = path.join(__dirname, "gif", "break.gif");

let totalSet = parseInt(process.argv[2]) || 1;
let setSekarang = 1;
let sedangFokus = true;
let sisaWaktu = FOCUS_TIME;
let timerHandle = null;

function putarAudio(filePath, volume, callback = () => {}) {
    const perintah = `"${mpvPath}" --really-quiet --no-video --volume=${volume} "${filePath}"`;
    exec(perintah, callback);
}

function mulaiSesiIstirahat() {
    if (!sedangFokus) {
        const mpvGuiPath = mpvPath.replace(".com", ".exe");

        // Konfigurasi MPV kamu tetap di sini
        const mpvOptions = {
            gifSize: "400x400",
            xPos: "100%",
            yPos: "0%",
            blurred: true,
        };

        const perintah = `"${mpvGuiPath}" ${mpvOptions.blurred ? "--vf=scale=64:64:flags=neighbor --sws-scaler=point" : ""} --scale=nearest --loop=inf --no-audio --really-quiet --autofit=${mpvOptions.gifSize} --geometry=${mpvOptions.xPos}:${mpvOptions.yPos} --ontop --no-border "${gifIstirahat}"`;

        exec(perintah);
        putarLaguLoop();
    }
}

function putarLaguLoop() {
    if (!sedangFokus) {
        putarAudio(soundIstirahat, VOL_MUSIK, (err) => {
            if (!sedangFokus) putarLaguLoop();
        });
    }
}

function bersihkanMPV(callback) {
    exec(`taskkill /F /IM mpv.com /T & taskkill /F /IM mpv.exe /T`, () => {
        if (callback) callback();
    });
}

function simpanLaporan() {
    const waktuSkrg = new Date().toLocaleDateString("id-ID");
    const jamSkrg = new Date().toLocaleTimeString("id-ID");
    const filePath = path.join(__dirname, "/report/laporan_pomo.txt");

    let konten =
        `\nREKAP SESI - ${waktuSkrg} ${jamSkrg}\n` + "=".repeat(30) + "\n";

    daftarTujuan.forEach((item) => {
        konten += `[Sesi ${item.sesi}] ${item.teks} | Selesai: ${item.date}\n`;
    });

    try {
        fs.appendFileSync(filePath, konten + "\n", "utf8");
        console.log("\n" + konten);
        console.log("✔ Laporan berhasil disimpan di: " + filePath);
    } catch (err) {
        console.error("❌ Gagal simpan file:", err.message);
    }
}

function mintaTujuan() {
    console.clear();
    console.log(`=== SESI FOKUS #${setSekarang} ===`);
    const jawaban = readline.question("Apa tujuan sesi ini? ");
    daftarTujuan.push({
        sesi: setSekarang,
        teks: jawaban || "Tanpa tujuan",
        date: new Date().toLocaleTimeString("id-ID"),
    });
}

function jalankanTimer() {
    if (timerHandle) clearInterval(timerHandle);
    timerHandle = setInterval(() => {
        const m = Math.floor(sisaWaktu / 60);
        const s = sisaWaktu % 60;
        const displayWaktu = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

        console.clear();
        console.log(`===================================`);
        console.log(` SET: ${setSekarang} / ${totalSet}`);
        console.log(` STATUS: ${sedangFokus ? "🔴 FOKUS" : "🟢 ISTIRAHAT"}`);
        console.log(` TUJUAN: ${daftarTujuan[setSekarang - 1]?.teks}`);
        console.log(` SISA WAKTU: ${displayWaktu}`);
        console.log(`===================================`);

        if (sisaWaktu <= 0) {
            pindahState();
        } else {
            sisaWaktu--;
        }
    }, 1000);
}

function pindahState() {
    clearInterval(timerHandle);
    if (sedangFokus) {
        bersihkanMPV(() => {
            putarAudio(soundSelesaiFokus, VOL_NOTIF, () => {
                sedangFokus = false;
                sisaWaktu = REST_TIME;
                mulaiSesiIstirahat();
                jalankanTimer();
            });
        });
    } else {
        bersihkanMPV(() => {
            sedangFokus = true;
            if (setSekarang < totalSet) {
                setSekarang++;
                putarAudio(soundMulaiFokus, VOL_NOTIF);
                mintaTujuan();
                sisaWaktu = FOCUS_TIME;
                jalankanTimer();
            } else {
                console.clear();
                simpanLaporan();
                process.exit();
            }
        });
    }
}

process.on("SIGINT", () => bersihkanMPV(() => process.exit()));

// Start program
bersihkanMPV(() => {
    mintaTujuan();
    jalankanTimer();
});
