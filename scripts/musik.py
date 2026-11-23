"""Dezente Hintergrundmusik für das YouTube-Video, selbst erzeugt (keine fremden Rechte).

Aufruf: python3 scripts/musik.py <Dauer in s> <Ziel.wav>
Ruhiges Stück in C-Dur, 92 Schläge pro Minute: weiche Flächen, gezupfte Arpeggien, leiser Bass, ganz leiser Shaker.
"""
import sys
import wave

import numpy as np

SR = 44100
dauer = float(sys.argv[1])
ziel = sys.argv[2]
n = int(dauer * SR)
links = np.zeros(n)
rechts = np.zeros(n)

BPM = 92
schlag = 60 / BPM
takt = 4 * schlag


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def lege(spur, start, ton):
    a = int(start * SR)
    if a >= n:
        return
    e = min(n, a + len(ton))
    spur[a:e] += ton[: e - a]


def tiefpass(x, alpha):
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc += alpha * (v - acc)
        y[i] = acc
    return y


def flaeche(midis, laenge):
    t = np.arange(int(laenge * SR)) / SR
    s = sum(np.sin(2 * np.pi * hz(m) * t) + 0.25 * np.sin(2 * np.pi * hz(m) * 2.003 * t) for m in midis)
    huelle = np.minimum(1, t / 0.5) * np.minimum(1, (laenge - t) / 0.6)
    return s * huelle / len(midis)


def zupf(midi, laenge=0.9):
    t = np.arange(int(laenge * SR)) / SR
    f = hz(midi)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 9) + 0.12 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t * 14)
    return s * np.exp(-t * 4.2) * np.minimum(1, t / 0.004) * np.minimum(1, (laenge - t) / 0.05)


def bass(midi, laenge):
    t = np.arange(int(laenge * SR)) / SR
    return np.sin(2 * np.pi * hz(midi) * t) * np.exp(-t * 1.6) * np.minimum(1, t / 0.01) * np.minimum(1, (laenge - t) / 0.08)


# I – vi – IV – V in C-Dur; Akkordtöne für Fläche (Oktave 4) und Arpeggio (Oktave 5)
akkorde = [
    (48, [60, 64, 67], [72, 76, 79, 84]),  # C
    (45, [57, 60, 64], [69, 72, 76, 81]),  # a
    (41, [57, 60, 65], [69, 72, 77, 81]),  # F
    (43, [59, 62, 67], [71, 74, 79, 83]),  # G
]
muster = [0, 1, 2, 3, 2, 1, 2, 3]  # Achtel-Arpeggio
rng = np.random.default_rng(7)
t0 = 0.0
k = 0
while t0 < dauer:
    grund, flaechen, arp = akkorde[k % 4]
    f = flaeche(flaechen, takt + 0.6) * 0.16
    lege(links, t0, f)
    lege(rechts, t0, f)
    for b in (0, 2):
        bz = bass(grund, schlag * 2) * 0.22
        lege(links, t0 + b * schlag, bz)
        lege(rechts, t0 + b * schlag, bz)
    # Arpeggio erst ab dem zweiten Durchgang, damit der Anfang ruhig beginnt
    if k >= 2:
        for i, idx in enumerate(muster):
            z = zupf(arp[idx]) * (0.13 if i % 2 == 0 else 0.10)
            pan = 0.35 if i % 2 == 0 else -0.35
            lege(links, t0 + i * schlag / 2, z * (1 - pan) / 1.35)
            lege(rechts, t0 + i * schlag / 2, z * (1 + pan) / 1.35)
    # Shaker auf den Achteln dazwischen, sehr leise, ab dem dritten Durchgang
    if k >= 4:
        for i in range(8):
            if i % 2 == 1:
                lang = int(0.07 * SR)
                rausch = rng.standard_normal(lang) * np.exp(-np.arange(lang) / SR * 60)
                rausch = rausch - tiefpass(rausch, 0.35)  # nur die Höhen
                lege(links, t0 + i * schlag / 2, rausch * 0.014)
                lege(rechts, t0 + i * schlag / 2, rausch * 0.014)
    t0 += takt
    k += 1

# Etwas Raum: zwei verzögerte, gedämpfte Echos über Kreuz
for spur, andere, d in ((links, rechts, 0.137), (rechts, links, 0.173)):
    v = int(d * SR)
    echo = np.zeros(n)
    echo[v:] = andere[:-v] * 0.22
    echo[2 * v :] += andere[: -2 * v] * 0.1
    spur += echo

stereo = np.stack([links, rechts], axis=1)
# Ein- und Ausblenden
t = np.arange(n) / SR
huelle = np.minimum(1, t / 1.5) * np.minimum(1, (dauer - t) / 3.0)
stereo *= np.clip(huelle, 0, 1)[:, None]
# Dezent: Effektivwert etwa -21 dBFS, Spitzen höchstens -3 dBFS
rms = np.sqrt(np.mean(stereo**2)) or 1
stereo *= 10 ** (-21 / 20) / rms
spitze = np.max(np.abs(stereo))
if spitze > 10 ** (-3 / 20):
    stereo *= 10 ** (-3 / 20) / spitze

daten = (stereo * 32767).astype(np.int16)
with wave.open(ziel, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(daten.tobytes())
