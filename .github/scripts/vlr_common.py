"""
vlr_common.py — lookup tables shared by the data scripts.

Lives here so build_orgmap.py and sync_roster.py cannot drift apart: a country
or agent added to one would otherwise silently be missing from the other.

Pure data and pure functions — importing this must never perform I/O.
"""

# ── Agent → Role map (all VALORANT agents — updated 2026-05-12) ───────────────
AGENT_ROLE = {
    # Duelists
    "jett":       "Duelist",
    "reyna":      "Duelist",
    "phoenix":    "Duelist",
    "neon":       "Duelist",
    "iso":        "Duelist",
    "raze":       "Duelist",
    "yoru":       "Duelist",
    "waylay":     "Duelist",
    # Initiators
    "sova":       "Initiator",
    "fade":       "Initiator",
    "breach":     "Initiator",
    "kayo":       "Initiator",
    "kay/o":      "Initiator",
    "skye":       "Initiator",
    "gekko":      "Initiator",
    "tejo":       "Initiator",
    # Controllers
    "brimstone":  "Controller",
    "viper":      "Controller",
    "omen":       "Controller",
    "astra":      "Controller",
    "harbor":     "Controller",
    "clove":      "Controller",
    "miks":       "Controller",
    # Sentinels
    "killjoy":    "Sentinel",
    "cypher":     "Sentinel",
    "sage":       "Sentinel",
    "chamber":    "Sentinel",
    "deadlock":   "Sentinel",
    "vyse":       "Sentinel",
    "veto":       "Sentinel",
}

# ── Country code → (Portuguese name, ISO uppercase) ───────────────────────────
COUNTRY_MAP = {
    "us": ("EUA",              "US"),
    "ca": ("Canadá",           "CA"),
    "br": ("Brasil",           "BR"),
    "cl": ("Chile",            "CL"),
    "ar": ("Argentina",        "AR"),
    "co": ("Colômbia",         "CO"),
    "mx": ("México",           "MX"),
    "do": ("Rep. Dominicana",  "DO"),
    "pe": ("Peru",             "PE"),
    "uy": ("Uruguai",          "UY"),
    "gb": ("Reino Unido",      "GB"),
    "uk": ("Reino Unido",      "GB"),
    "de": ("Alemanha",         "DE"),
    "fr": ("França",           "FR"),
    "es": ("Espanha",          "ES"),
    "tr": ("Turquia",          "TR"),
    "ua": ("Ucrânia",          "UA"),
    "ru": ("Rússia",           "RU"),
    "se": ("Suécia",           "SE"),
    "dk": ("Dinamarca",        "DK"),
    "fi": ("Finlândia",        "FI"),
    "no": ("Noruega",          "NO"),
    "nl": ("Holanda",          "NL"),
    "be": ("Bélgica",          "BE"),
    "pl": ("Polônia",          "PL"),
    "pt": ("Portugal",         "PT"),
    "it": ("Itália",           "IT"),
    "hr": ("Croácia",          "HR"),
    "ro": ("Romênia",          "RO"),
    "rs": ("Sérvia",           "RS"),
    "kz": ("Cazaquistão",      "KZ"),
    "kg": ("Quirguistão",      "KG"),
    "mn": ("Mongólia",         "MN"),
    "ma": ("Marrocos",         "MA"),
    "kr": ("Coreia do Sul",    "KR"),
    "jp": ("Japão",            "JP"),
    "cn": ("China",            "CN"),
    "tw": ("Taiwan",           "TW"),
    "hk": ("Hong Kong",        "HK"),
    "sg": ("Singapura",        "SG"),
    "th": ("Tailândia",        "TH"),
    "ph": ("Filipinas",        "PH"),
    "id": ("Indonésia",        "ID"),
    "my": ("Malásia",          "MY"),
    "vn": ("Vietnã",           "VN"),
    "au": ("Austrália",        "AU"),
    "nz": ("Nova Zelândia",    "NZ"),
    "in": ("Índia",            "IN"),
    "pk": ("Paquistão",        "PK"),
    "ch": ("Suíça",            "CH"),
    "cz": ("República Tcheca", "CZ"),
    "lt": ("Lituânia",         "LT"),
    "md": ("Moldávia",         "MD"),
    "eg": ("Egito",            "EG"),
    "sa": ("Arábia Saudita",   "SA"),
    "kh": ("Camboja",          "KH"),
    "bm": ("Bermudas",         "BM"),
}

# Liquipedia reports `nationality` as an English country name rather than a
# code, so it needs its own way in to the table above.
COUNTRY_NAME_TO_CODE = {
    "united states":        "us",
    "usa":                  "us",
    "canada":               "ca",
    "brazil":               "br",
    "chile":                "cl",
    "argentina":            "ar",
    "colombia":             "co",
    "mexico":               "mx",
    "dominican republic":   "do",
    "peru":                 "pe",
    "uruguay":              "uy",
    "united kingdom":       "gb",
    "england":              "gb",
    "scotland":             "gb",
    "wales":                "gb",
    "germany":              "de",
    "france":               "fr",
    "spain":                "es",
    "turkey":               "tr",
    "türkiye":              "tr",
    "ukraine":              "ua",
    "russia":               "ru",
    "sweden":               "se",
    "denmark":              "dk",
    "finland":              "fi",
    "norway":               "no",
    "netherlands":          "nl",
    "belgium":              "be",
    "poland":               "pl",
    "portugal":             "pt",
    "italy":                "it",
    "croatia":              "hr",
    "romania":              "ro",
    "serbia":               "rs",
    "kazakhstan":           "kz",
    "kyrgyzstan":           "kg",
    "mongolia":             "mn",
    "morocco":              "ma",
    "south korea":          "kr",
    "korea":                "kr",
    "japan":                "jp",
    "china":                "cn",
    "taiwan":               "tw",
    "hong kong":            "hk",
    "singapore":            "sg",
    "thailand":             "th",
    "philippines":          "ph",
    "indonesia":            "id",
    "malaysia":             "my",
    "vietnam":              "vn",
    "australia":            "au",
    "new zealand":          "nz",
    "india":                "in",
    "pakistan":             "pk",
    "switzerland":          "ch",
    "czech republic":       "cz",
    "lithuania":            "lt",
    "moldova":              "md",
    "egypt":                "eg",
    "saudi arabia":         "sa",
    "cambodia":             "kh",
    "bermuda":              "bm",
}


def agent_to_role(agent_name):
    """Map an agent name to its role, or None when unknown."""
    return AGENT_ROLE.get((agent_name or "").strip().lower())


def country_from_code(code):
    """Return (country_pt, countryCode_upper), or (None, None) if unknown."""
    if not code:
        return None, None
    return COUNTRY_MAP.get(code.lower().strip()) or (None, None)


def country_from_name(name):
    """Same as country_from_code but for a Liquipedia English country name."""
    code = COUNTRY_NAME_TO_CODE.get((name or "").strip().lower())
    return country_from_code(code) if code else (None, None)
