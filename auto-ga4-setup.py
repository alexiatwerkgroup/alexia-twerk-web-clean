#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
auto-ga4-setup.py - 2026-05-08
Automatiza el setup de Internal Traffic en GA4 usando Playwright + tu Chrome
profile (con tu sesion Google ya logueada — sin pedirte 2FA).

Lo que hace:
  1. Lanza Chrome con tu user_data_dir (auth automatica)
  2. Navega a analytics.google.com
  3. Crea la rule "My Internal Traffic" con IP 181.21.19.236
  4. Setea el Data Filter "Internal Traffic" en TESTING
  5. Te deja la pestana abierta para que verifiques en Realtime

REQUISITOS (1 vez):
    pip install playwright
    playwright install chromium

CRITICAL: Cerra TODAS las ventanas de Chrome ANTES de correr este script.
Playwright no puede usar tu profile si Chrome esta abierto.

Uso:
    python auto-ga4-setup.py
"""
import os
import sys
import time
from pathlib import Path

# Config — editar si tu Chrome no esta en el path default
CHROME_PROFILE = Path(os.environ.get("USERPROFILE", "")) / "AppData/Local/Google/Chrome/User Data"
GA4_PROPERTY_ID = "G-YSFR7FHCLS"
INTERNAL_IP = "181.21.19.236"
RULE_NAME = "My Internal Traffic"

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
except ImportError:
    print("ERROR: Playwright no instalado.")
    print("  Corre: pip install playwright && playwright install chromium")
    sys.exit(1)


def log(msg, level="INFO"):
    colors = {"INFO": "\033[36m", "OK": "\033[32m", "WARN": "\033[33m", "ERR": "\033[31m"}
    reset = "\033[0m"
    print(f"{colors.get(level,'')}[{level}]{reset} {msg}")


def main():
    if not CHROME_PROFILE.exists():
        log(f"Chrome profile no existe en: {CHROME_PROFILE}", "ERR")
        log("Edita CHROME_PROFILE en este script con tu path correcto.", "ERR")
        sys.exit(1)

    log("Cerrando Chrome si esta abierto (Playwright no puede compartir el profile)...")
    log("  Si ves errores de 'profile in use', cerra TODAS las ventanas de Chrome.", "WARN")

    with sync_playwright() as p:
        try:
            ctx = p.chromium.launch_persistent_context(
                user_data_dir=str(CHROME_PROFILE),
                channel="chrome",
                headless=False,
                args=["--start-maximized", "--no-first-run"],
                viewport=None,
            )
        except Exception as e:
            log(f"No pude lanzar Chrome con tu profile: {e}", "ERR")
            log("Cerra TODAS las ventanas de Chrome y reintenta.", "WARN")
            sys.exit(1)

        page = ctx.new_page()
        page.set_default_timeout(60000)

        # ── 1) Abrir GA4 ──────────────────────────────────────────────────
        log("Abriendo Google Analytics...")
        page.goto("https://analytics.google.com/analytics/web/", wait_until="domcontentloaded")

        # Esperar que termine de cargar (puede pedir auth o 2FA en raros casos)
        log("Esperando que GA4 cargue completamente (~10-30s)...")
        try:
            page.wait_for_selector("text=Admin", timeout=45000)
        except PlaywrightTimeout:
            log("GA4 no termino de cargar. Quizas necesita 2FA — completalo manual y volve a correr.", "WARN")
            input("Presiona ENTER cuando GA4 este completamente cargado...")

        log("GA4 cargado.", "OK")

        # ── 2) Click Admin ────────────────────────────────────────────────
        log("Click Admin...")
        try:
            page.click("text=Admin", timeout=10000)
            page.wait_for_load_state("networkidle", timeout=15000)
        except Exception as e:
            log(f"No encontre Admin: {e}", "WARN")

        # ── 3) Click Data Streams ─────────────────────────────────────────
        log("Click Data streams...")
        try:
            page.click("text=Data streams", timeout=10000)
            page.wait_for_load_state("networkidle", timeout=10000)
        except Exception as e:
            log(f"No encontre Data streams: {e}", "WARN")

        # ── 4) Click el stream de alexiatwerkgroup ─────────────────────────
        log("Click el stream alexiatwerkgroup.com...")
        try:
            # Buscar por measurement ID o por nombre
            page.click(f"text=/alexiatwerkgroup|{GA4_PROPERTY_ID}/i", timeout=10000)
            page.wait_for_load_state("networkidle", timeout=10000)
        except Exception as e:
            log(f"No encontre el stream — selecciona MANUAL y presiona ENTER", "WARN")
            input("Cuando estes en el stream alexiatwerkgroup.com, ENTER para seguir...")

        # ── 5) Configure tag settings ─────────────────────────────────────
        log("Click Configure tag settings...")
        try:
            page.click("text=Configure tag settings", timeout=10000)
            page.wait_for_load_state("networkidle", timeout=10000)
        except Exception as e:
            log(f"No encontre Configure tag settings: {e}", "WARN")
            input("Cuando estes en tag settings, ENTER...")

        # ── 6) Show all ───────────────────────────────────────────────────
        log("Click Show all...")
        try:
            page.click("text=Show all", timeout=8000)
        except Exception:
            pass  # may not exist if already expanded

        # ── 7) Define internal traffic ────────────────────────────────────
        log("Click Define internal traffic...")
        try:
            page.click("text=Define internal traffic", timeout=10000)
            page.wait_for_load_state("networkidle", timeout=10000)
        except Exception as e:
            log(f"No encontre Define internal traffic: {e}", "WARN")
            input("Cuando estes en internal traffic, ENTER...")

        # ── 8) Click Create ───────────────────────────────────────────────
        log("Click Create...")
        try:
            page.click("text=Create", timeout=8000)
            time.sleep(2)
        except Exception as e:
            log(f"No encontre Create — probable que ya tengas la rule creada", "WARN")

        # ── 9) Llenar el form ─────────────────────────────────────────────
        log(f"Llenando form: name='{RULE_NAME}', IP='{INTERNAL_IP}'...")
        try:
            # Rule name
            name_input = page.locator("input[placeholder*='name' i], input[aria-label*='name' i]").first
            name_input.fill(RULE_NAME)
            time.sleep(0.5)

            # IP value (puede haber multiple inputs — agarra el de IP)
            ip_input = page.locator("input[placeholder*='IP' i], input[placeholder*='value' i]").last
            ip_input.fill(INTERNAL_IP)
            time.sleep(0.5)

            log("Form llenado.", "OK")
        except Exception as e:
            log(f"No pude llenar el form automaticamente: {e}", "WARN")
            log(f"Llenalo manual: name={RULE_NAME}, IP={INTERNAL_IP}", "WARN")
            input("Cuando lo llenes, ENTER...")

        # ── 10) Click Create (boton final) ────────────────────────────────
        log("Click Create (final) — VOS confirma manualmente para evitar errores")
        log(f"  Verifica que: name='{RULE_NAME}', IP='{INTERNAL_IP}', traffic_type='internal'", "INFO")
        input("Si todo esta OK, click 'Create' en GA4 y despues ENTER aqui...")

        # ── 11) Data Filters ──────────────────────────────────────────────
        log("Navegando a Data filters...")
        try:
            # Volver a Admin si hace falta
            page.click("text=Admin", timeout=8000)
            time.sleep(1)
            page.click("text=Data filters", timeout=8000)
            page.wait_for_load_state("networkidle", timeout=10000)
        except Exception as e:
            log(f"Buscando Data filters manual: {e}", "WARN")

        log("BUSCA 'Internal Traffic' en la lista. Cambia su estado a TESTING.", "INFO")
        log("  (no Active todavia — testing primero para verificar)", "WARN")
        input("Cuando lo hayas seteado en TESTING, ENTER para terminar...")

        log("DONE.", "OK")
        log("Verifica en GA4 -> Reports -> Realtime que tus visitas tienen traffic_type=internal", "OK")
        log("Una vez verificado, vuelve a Data filters y cambialo a ACTIVE.", "OK")

        input("ENTER para cerrar Chrome...")
        ctx.close()


if __name__ == "__main__":
    main()
