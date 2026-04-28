"""
Index GraphQL data into the RAG system instead of scraping websites.

This script queries the SHPE UF GraphQL API and indexes structured data
into ChromaDB for the chatbot to use.

Usage (run from project root):
    python rag/scripts/index_graphql_data.py [--dry-run]
"""

import json
import hashlib
import requests
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Configuration
GRAPHQL_URL = "http://localhost:4000/"
RAG_API_URL = "http://localhost:8001"
DRY_RUN = "--dry-run" in sys.argv
CACHE_FILE = Path("rag/.graphql_cache.json")


def _load_cache() -> Dict[str, str]:
    if CACHE_FILE.exists():
        try:
            return json.loads(CACHE_FILE.read_text())
        except (json.JSONDecodeError, OSError):
            return {}
    return {}


def _save_cache(cache: Dict[str, str]) -> None:
    CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    CACHE_FILE.write_text(json.dumps(cache, indent=2, sort_keys=True))


def _compute_data_hash(records: List[Dict]) -> str:
    serialized = json.dumps(records, sort_keys=True, ensure_ascii=False)
    return hashlib.md5(serialized.encode("utf-8")).hexdigest()


def _is_cache_hit(cache: Dict[str, str], key: str, data_hash: str) -> bool:
    return cache.get(key) == data_hash


def _update_cache(cache: Dict[str, str], key: str, data_hash: str) -> None:
    cache[key] = data_hash
    _save_cache(cache)


CACHE_STATE: Dict[str, str] = _load_cache()

def query_graphql(query: str) -> Dict:
    """Query the GraphQL API and return the response"""
    try:
        response = requests.post(
            GRAPHQL_URL,
            json={"query": query},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        response.raise_for_status()

        data = response.json()

        # Check for GraphQL errors
        if "errors" in data:
            print(f"GraphQL error: {data['errors']}")
            return None

        return data.get("data", {})

    except requests.exceptions.RequestException as e:
        print(f"Failed to query GraphQL API: {e}")
        return None


def transform_events_to_chunks(events: List[Dict]) -> List[str]:
    """
    Transform event JSON objects into natural language chunks.

    Args:
        events: List of event dictionaries from GraphQL

    Returns:
        List of natural language strings suitable for embedding
    """
    chunks: List[str] = []

    category_context = {
        "social": "These socials are perfect for meeting other SHPE members and building community.",
        "workshop": "Workshops focus on professional development and hands-on learning.",
        "corporate event": "Corporate events connect you with recruiters and industry partners.",
        "general body meeting": "General Body Meetings keep you updated on chapter news and upcoming opportunities.",
        "volunteering": "Volunteering opportunities help you give back while strengthening our chapter's impact.",
        "cabinet meeting": "Cabinet meetings support internal coordination and leadership collaboration.",
    }

    for event in events:
        name = (event.get("name") or "Unnamed event").strip()
        category = (event.get("category") or "General").strip()
        semester = (event.get("semester") or "an upcoming semester").strip()
        points = event.get("points")

        category_note = category_context.get(category.lower())
        points_text: str
        if points is None:
            points_text = "This event does not list a point value but still contributes to your involvement."
        elif points == 0:
            points_text = "This event does not award points, yet participation still helps you stay engaged."
        else:
            plural = "point" if points == 1 else "points"
            points_text = f"Attending counts for {points} {plural} toward your membership goals."

        description_parts = [
            f"{name} is a {category} event taking place during the {semester}.",
            category_note,
            points_text,
        ]

        chunk = " ".join(part for part in description_parts if part)
        chunks.append(chunk)

    return chunks


def transform_tasks_to_chunks(tasks: List[Dict]) -> List[str]:
    """Transform task JSON objects into natural language chunks."""
    chunks: List[str] = []

    for task in tasks:
        name = (task.get("name") or "Unnamed task").strip()
        description = (task.get("description") or "").strip()
        semester = (task.get("semester") or "an upcoming semester").strip()
        start = (task.get("startDate") or "").strip()
        end = (task.get("endDate") or "").strip()
        points = task.get("points")

        schedule_text: Optional[str] = None
        if start and end:
            schedule_text = f"It runs from {start} through {end}."
        elif start:
            schedule_text = f"It begins on {start}."
        elif end:
            schedule_text = f"It must be completed by {end}."

        if points is None:
            points_text = "Completing this task contributes to your involvement but has no point value listed."
        elif points == 0:
            points_text = "Completing this task keeps you engaged even though it does not award points."
        else:
            plural = "point" if points == 1 else "points"
            points_text = f"Completing it is worth {points} {plural} toward your membership standing."

        description_text = description or "Check the task details page for requirements."

        description_parts = [
            f"{name} is a task for the {semester}.",
            schedule_text,
            description_text,
            points_text,
        ]

        chunk = " ".join(part for part in description_parts if part)
        chunks.append(chunk)

    return chunks


def transform_corporations_to_chunks(corporations: List[Dict]) -> List[str]:
    """Transform corporation JSON objects into natural language chunks."""
    chunks: List[str] = []

    partnership_flags = {
        "academia": "supports academic partnerships",
        "govContractor": "works with government contracts",
        "nonProfit": "engages in nonprofit initiatives",
        "visaSponsor": "offers visa sponsorship opportunities",
        "shpeSponsor": "actively sponsors SHPE UF programs",
        "industryPartnership": "maintains industry partnerships with SHPE UF",
        "fallBBQ": "participates in the fall BBQ",
        "springBBQ": "participates in the spring BBQ",
        "nationalConvention": "supports the SHPE National Convention",
        "recruitmentDay": "takes part in SHPE UF recruitment day",
    }

    for corp in corporations:
        name = (corp.get("name") or "Unnamed corporation").strip()
        industries = [item.strip() for item in (corp.get("industries") or []) if item]
        majors = [item.strip() for item in (corp.get("majors") or []) if item]
        overview = (corp.get("overview") or "").strip()
        mission = (corp.get("mission") or "").strip()
        goals = (corp.get("goals") or "").strip()
        business_model = (corp.get("businessModel") or "").strip()
        apply_link = (corp.get("applyLink") or "").strip()
        sign_up_link = (corp.get("signUpLink") or "").strip()

        partnership_details = [
            phrase for key, phrase in partnership_flags.items() if corp.get(key)
        ]

        industries_text = ""
        if industries:
            industries_text = f"They operate in industries such as {', '.join(industries)}."

        majors_text = ""
        if majors:
            majors_text = f"They recruit students majoring in {', '.join(majors)}."

        overview_text = overview or mission or goals
        if overview_text:
            overview_text = f"Overview: {overview_text}"

        mission_text = ""
        if mission and mission != overview:
            mission_text = f"Mission focus: {mission}"

        goals_text = ""
        if goals and goals not in (overview, mission):
            goals_text = f"Key goals: {goals}"

        business_model_text = ""
        if business_model:
            business_model_text = f"Their business model centers on {business_model}."

        partnership_text = ""
        if partnership_details:
            partnership_text = f"As a partner, {name} {', '.join(partnership_details)}."

        action_text = ""
        if apply_link and sign_up_link:
            action_text = f"Explore opportunities at {apply_link} or join interest lists via {sign_up_link}."
        elif apply_link:
            action_text = f"Explore opportunities or apply at {apply_link}."
        elif sign_up_link:
            action_text = f"Join their interest list at {sign_up_link}."

        description_parts = [
            f"{name} partners with SHPE UF to connect members with career opportunities.",
            industries_text,
            majors_text,
            overview_text,
            mission_text,
            goals_text,
            business_model_text,
            partnership_text,
            action_text,
        ]

        chunk = " ".join(part for part in description_parts if part)
        chunks.append(chunk)

    return chunks


def transform_partners_to_chunks(partners: List[Dict]) -> List[str]:
    """Transform partner JSON objects into natural language chunks."""
    chunks: List[str] = []

    tier_context = {
        "bronze": "Bronze partners help keep recurring programs running.",
        "silver": "Silver partners provide sustained support for signature events and workshops.",
        "gold": "Gold partners are deeply involved in mentorship, recruiting, and flagship programming.",
        "platinum": "Platinum partners sponsor multiple marquee events and help guide long-term initiatives.",
        "diamond": "Diamond partners provide transformational support across the entire SHPE UF experience.",
    }

    for partner in partners:
        name = (partner.get("name") or "Unnamed partner").strip()
        tier = (partner.get("tier") or "Partner").strip()

        tier_note = tier_context.get(tier.lower())
        description_parts = [
            f"{name} is a {tier} level partner of SHPE UF.",
            tier_note,
            "Reach out through SHPE UF leadership to collaborate with this partner.",
        ]

        chunk = " ".join(part for part in description_parts if part)
        chunks.append(chunk)

    return chunks


def transform_resources_to_chunks(resources: List[Dict]) -> List[str]:
    """Transform resource JSON objects into natural language chunks."""
    chunks: List[str] = []

    for resource in resources:
        title = (resource.get("title") or "Unnamed resource").strip()
        description = (resource.get("description") or "").strip()
        link = (resource.get("link") or "").strip()
        is_podcast = resource.get("podcast")

        type_text = "This podcast" if is_podcast else "This resource"
        description_text = description or "Check it out to learn more."

        if link:
            access_text = f"Access it at {link}."
        else:
            access_text = "Contact the SHPE UF board for access instructions."

        description_parts = [
            f"{title} is available to help SHPE UF members grow.",
            f"{type_text} covers: {description_text}",
            access_text,
        ]

        chunk = " ".join(part for part in description_parts if part)
        chunks.append(chunk)

    return chunks


def transform_alumni_to_chunks(alumni: List[Dict]) -> List[str]:
    """Transform alumni JSON objects into natural language chunks."""
    chunks: List[str] = []

    for alum in alumni:
        first_name = (alum.get("firstName") or "").strip()
        last_name = (alum.get("lastName") or "").strip()
        full_name = f"{first_name} {last_name}".strip() or "A SHPE UF alumnus"

        undergrad = alum.get("undergrad") or {}
        undergrad_major = (undergrad.get("major") or "").strip()
        undergrad_university = (undergrad.get("university") or "").strip()
        undergrad_year = undergrad.get("year")

        grad = alum.get("grad") or {}
        grad_university = (grad.get("university") or "").strip()
        grad_major = (grad.get("major") or "").strip()
        grad_year = grad.get("year")

        employer = (alum.get("employer") or "").strip()
        position = (alum.get("position") or "").strip()
        linkedin = (alum.get("linkedin") or "").strip()

        location = alum.get("location") or {}
        city = (location.get("city") or "").strip()
        state = (location.get("state") or "").strip()
        country = (location.get("country") or "").strip()

        location_parts = [city, state, country]
        location_text = ", ".join(part for part in location_parts if part)
        if location_text:
            location_text = f"Based in {location_text}."

        academic_path = []
        if undergrad_major:
            academic_sentence = f"Studied {undergrad_major}"
            if undergrad_university:
                academic_sentence += f" at {undergrad_university}"
            if undergrad_year:
                academic_sentence += f", class of {undergrad_year}"
            academic_path.append(academic_sentence + ".")

        if grad_university:
            grad_sentence = f"Graduate studies at {grad_university}"
            if grad_major:
                grad_sentence += f" in {grad_major}"
            if grad_year:
                grad_sentence += f", class of {grad_year}"
            academic_path.append(grad_sentence + ".")

        career_sentence = ""
        if employer and position:
            career_sentence = f"Currently works as {position} at {employer}."
        elif employer:
            career_sentence = f"Currently works at {employer}."
        elif position:
            career_sentence = f"Holds the role of {position}."

        network_sentence = ""
        if linkedin:
            network_sentence = f"Connect with {full_name} via LinkedIn: {linkedin}."

        description_parts = [
            f"{full_name} is part of the SHPE UF alumni network.",
            location_text,
            " ".join(academic_path).strip(),
            career_sentence,
            "They are a great contact for mentorship or networking.",
            network_sentence,
        ]

        chunk = " ".join(part for part in description_parts if part)
        chunks.append(chunk)

    return chunks


def fetch_and_transform_events() -> Tuple[List[str], Optional[str], str]:
    """Fetch events from GraphQL and transform to chunks"""
    print("Fetching events from GraphQL API...")

    query = """
    {
        getEvents {
            name
            category
            points
            semester
        }
    }
    """

    data = query_graphql(query)

    if not data or "getEvents" not in data:
        print("Failed to fetch events")
        return [], None, "events"

    events = data["getEvents"] or []
    cache_key = "events"
    data_hash = _compute_data_hash(events)

    if not DRY_RUN and _is_cache_hit(CACHE_STATE, cache_key, data_hash):
        print("Events unchanged since last run; skipping indexing.")
        return [], None, cache_key

    print(f"Fetched {len(events)} events")

    chunks = transform_events_to_chunks(events)
    print(f"Created {len(chunks)} text chunks from events")

    return chunks, data_hash, cache_key


def fetch_and_transform_tasks() -> Tuple[List[str], Optional[str], str]:
    """Fetch tasks from GraphQL and transform to chunks"""
    print("Fetching tasks from GraphQL API...")

    query = """
    {
        getTasks {
            name
            description
            points
            semester
            startDate
            endDate
        }
    }
    """

    data = query_graphql(query)

    if not data or "getTasks" not in data:
        print("Failed to fetch tasks")
        return [], None, "tasks"

    tasks = data["getTasks"] or []
    cache_key = "tasks"
    data_hash = _compute_data_hash(tasks)

    if not DRY_RUN and _is_cache_hit(CACHE_STATE, cache_key, data_hash):
        print("Tasks unchanged since last run; skipping indexing.")
        return [], None, cache_key

    print(f"Fetched {len(tasks)} tasks")

    chunks = transform_tasks_to_chunks(tasks)
    print(f"Created {len(chunks)} text chunks from tasks")

    return chunks, data_hash, cache_key


def fetch_and_transform_corporations() -> Tuple[List[str], Optional[str], str]:
    """Fetch corporations from GraphQL and transform to chunks"""
    print("Fetching corporations from GraphQL API...")

    query = """
    {
        getCorporations {
            name
            industries
            majors
            overview
            mission
            goals
            businessModel
            applyLink
            signUpLink
            academia
            govContractor
            nonProfit
            visaSponsor
            shpeSponsor
            industryPartnership
            fallBBQ
            springBBQ
            nationalConvention
            recruitmentDay
        }
    }
    """

    data = query_graphql(query)

    if not data or "getCorporations" not in data:
        print("Failed to fetch corporations")
        return [], None, "corporations"

    corporations = data["getCorporations"] or []
    cache_key = "corporations"
    data_hash = _compute_data_hash(corporations)

    if not DRY_RUN and _is_cache_hit(CACHE_STATE, cache_key, data_hash):
        print("Corporations unchanged since last run; skipping indexing.")
        return [], None, cache_key

    print(f"Fetched {len(corporations)} corporations")

    chunks = transform_corporations_to_chunks(corporations)
    print(f"Created {len(chunks)} text chunks from corporations")

    return chunks, data_hash, cache_key


def fetch_and_transform_partners() -> Tuple[List[str], Optional[str], str]:
    """Fetch partners from GraphQL and transform to chunks"""
    print("Fetching partners from GraphQL API...")

    query = """
    {
        getPartners {
            name
            tier
        }
    }
    """

    data = query_graphql(query)

    if not data or "getPartners" not in data:
        print("Failed to fetch partners")
        return [], None, "partners"

    partners = data["getPartners"] or []
    cache_key = "partners"
    data_hash = _compute_data_hash(partners)

    if not DRY_RUN and _is_cache_hit(CACHE_STATE, cache_key, data_hash):
        print("Partners unchanged since last run; skipping indexing.")
        return [], None, cache_key

    print(f"Fetched {len(partners)} partners")

    chunks = transform_partners_to_chunks(partners)
    print(f"Created {len(chunks)} text chunks from partners")

    return chunks, data_hash, cache_key


def fetch_and_transform_resources() -> Tuple[List[str], Optional[str], str]:
    """Fetch resources from GraphQL and transform to chunks"""
    print("Fetching resources from GraphQL API...")

    query = """
    {
        getResources {
            title
            description
            link
            podcast
        }
    }
    """

    data = query_graphql(query)

    if not data or "getResources" not in data:
        print("Failed to fetch resources")
        return [], None, "resources"

    resources = data["getResources"] or []
    cache_key = "resources"
    data_hash = _compute_data_hash(resources)

    if not DRY_RUN and _is_cache_hit(CACHE_STATE, cache_key, data_hash):
        print("Resources unchanged since last run; skipping indexing.")
        return [], None, cache_key

    print(f"Fetched {len(resources)} resources")

    chunks = transform_resources_to_chunks(resources)
    print(f"Created {len(chunks)} text chunks from resources")

    return chunks, data_hash, cache_key


def fetch_and_transform_alumni() -> Tuple[List[str], Optional[str], str]:
    """Fetch alumni from GraphQL and transform to chunks"""
    print("Fetching alumni from GraphQL API...")

    query = """
    {
        getAlumnis {
            firstName
            lastName
            employer
            position
            linkedin
            undergrad {
                university
                year
                major
            }
            grad {
                university
                year
                major
            }
            location {
                city
                state
                country
            }
        }
    }
    """

    data = query_graphql(query)

    if not data or "getAlumnis" not in data:
        print("Failed to fetch alumni")
        return [], None, "alumni"

    alumni = data["getAlumnis"] or []
    cache_key = "alumni"
    data_hash = _compute_data_hash(alumni)

    if not DRY_RUN and _is_cache_hit(CACHE_STATE, cache_key, data_hash):
        print("Alumni unchanged since last run; skipping indexing.")
        return [], None, cache_key

    print(f"Fetched {len(alumni)} alumni")

    chunks = transform_alumni_to_chunks(alumni)
    print(f"Created {len(chunks)} text chunks from alumni")

    return chunks, data_hash, cache_key


def fetch_and_transform_general_info() -> Tuple[List[str], Optional[str], str]:
    """Return hardcoded general information about SHPE UF"""
    print("Generating general info chunks...")
    
    chunks = [
        "SHPE UF (Society of Hispanic Professional Engineers at the University of Florida) is a student organization dedicated to empowering Hispanic and Latino students in STEM. Our mission is to change lives by empowering the Hispanic community to realize its fullest potential and to impact the world through STEM awareness, access, support, and development.",
        "SHPE UF provides professional development, mentorship, academic support, and networking opportunities with top companies. We host general body meetings, workshops, socials, and attend the SHPE National Convention.",
        "The SHPE UF chapter is one of the largest and most active in the nation, winning multiple awards for its impact on students and the community.",
        "Membership in SHPE UF is open to all students who support our mission, regardless of background or major. Active members can earn points by attending events and completing tasks."
    ]
    
    # Always re-index general info (no cache check needed for hardcoded data)
    return chunks, "general_info_hash", "general_info"


def index_chunks(chunks: List[str], source_name: str = "SHPE UF Events", dry_run: bool = False) -> bool:
    """Index text chunks into the RAG system"""
    if not chunks:
        print("No chunks to index")
        return False

    print(f"\nPreparing to index {len(chunks)} chunks from {source_name}...")

    try:
        # Check RAG API health
        health_response = requests.get(f"{RAG_API_URL}/health", timeout=5)
        if health_response.status_code != 200:
            print("RAG API health check failed")
            return False

        print("RAG API health check passed")

        if dry_run:
            preview_count = min(5, len(chunks))
            print(f"Dry run enabled. Previewing {preview_count} chunk(s):")
            for i in range(preview_count):
                prefix = chunks[i][:160]
                suffix = "..." if len(chunks[i]) > 160 else ""
                print(f"  [{i+1}] {prefix}{suffix}")
            return False

        payload = {
            "source_name": source_name,
            "chunks": chunks,
        }

        response = requests.post(
            f"{RAG_API_URL}/index_text",
            json=payload,
            timeout=15
        )

        if response.status_code != 200:
            print(f"Failed to index chunks: {response.status_code} {response.text}")
            return False

        result = response.json()
        indexed = result.get("chunks_indexed", len(chunks))
        print(f"Indexed {indexed} chunk(s) for {source_name}")
        preview_count = min(3, len(chunks))
        if preview_count:
            print("Sample indexed chunks:")
            for i in range(preview_count):
                snippet = chunks[i][:160]
                ellipsis = "..." if len(chunks[i]) > 160 else ""
                print(f"  [{i+1}] {snippet}{ellipsis}")

    except requests.exceptions.RequestException as e:
        print(f"Failed to connect to RAG API: {e}")
        return False

    return True


def main():
    print("Starting GraphQL data indexing...\n")

    data_sources = [
        ("General Info", fetch_and_transform_general_info),
        ("Events", fetch_and_transform_events),
        ("Tasks", fetch_and_transform_tasks),
        ("Corporations", fetch_and_transform_corporations),
        ("Partners", fetch_and_transform_partners),
        ("Resources", fetch_and_transform_resources),
        ("Alumni", fetch_and_transform_alumni),
    ]

    total_chunks = 0

    for source_name, fetch_fn in data_sources:
        print(f"\n=== {source_name.upper()} ===")
        chunks, data_hash, cache_key = fetch_fn()
        total_chunks += len(chunks)

        if not chunks:
            if data_hash and not DRY_RUN:
                _update_cache(CACHE_STATE, cache_key, data_hash)
            continue

        indexed = index_chunks(chunks, f"SHPE UF {source_name}", dry_run=DRY_RUN)

        if not DRY_RUN and data_hash and indexed:
            _update_cache(CACHE_STATE, cache_key, data_hash)

    print("\nIndexing run complete.")
    print(f"Total chunks prepared: {total_chunks}")
    if DRY_RUN:
        print("Dry run mode enabled: no data was sent to the RAG API.")


if __name__ == "__main__":
    main()
