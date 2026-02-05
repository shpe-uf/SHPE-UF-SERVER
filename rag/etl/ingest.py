import sys
import os

# Add the parent parent directory to sys.path to allow imports from app
# This is a common hack for running standalone scripts inside a package structure
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.rag import rag_engine

def run_ingestion():
    """
    Sample ETL script to populate the vector database with initial data.
    In the future, this can be expanded to read PDF files or JSON dumps.
    """
    print("🚀 Starting Ingestion Process...")

    # 1. Define some sample data (The "Knowledge Base")
    documents = [
    # --- History & Mission ---
    "SHPE UF (Society of Hispanic Professional Engineers at University of Florida) was founded in 1982.",
    "SHPE UF's mission is to change lives by empowering the Hispanic community to realize its fullest potential.",
    "The chapter is dedicated to increasing the number of Hispanics in STEM fields.",
    "SHPE UF is one of the largest and most active chapters in SHPE Region 7.",
    "The vision of SHPE National is a world where Hispanics are highly valued and influential as the leading innovators, scientists, mathematicians, and engineers.",
    
    # --- Membership & Points ---
    "To become an active member, you need to earn 15 points per semester.",
    "Active membership status grants you access to voting rights during elections.",
    "Points can be earned by attending General Body Meetings, socials, and service events.",
    "Attending a GBM is usually worth 1 point.",
    "Volunteering for a standard hour shift typically earns 1.5 points.",
    "Membership dues are paid annually to SHPE National, which covers chapter membership.",
    "Active members get priority access to ride-sharing for out-of-town conferences.",
    "To be considered for the Member of the Month award, you must exceed the minimum point threshold.",
    
    # --- Meetings & Events ---
    "General Body Meetings (GBM) usually happen every other Wednesday.",
    "GBMs are typically held in the Reitz Union Auditorium or CSE E121.",
    "The Cabinet meetings are held bi-weekly on Mondays at Reitz Union.",
    "Cabinet meetings are open to directors and chairs to discuss upcoming logistics.",
    "The SHPE BBQ is an annual tradition usually held at Lake Wauburg.",
    "Socials are held various times throughout the semester, often on Thursday or Friday evenings.",
    "The 'New Member Social' is specifically designed to welcome freshmen and transfer students.",
    "Collaborative events with other orgs like NSBE or SASE happen once a semester.",
    
    # --- Academics & SHPE Jr ---
    "SHPE Jr. is the high school outreach program where we mentor local students.",
    "Study nights are hosted at Marston Science Library during exam weeks.",
    "The Academic Excellence chair organizes workshops on resume building and interview prep.",
    "ACE (Academic Committee for Engineering) provides free tutoring for calculus and physics.",
    "SHPE UF offers scholarships for active members who demonstrate academic improvement.",
    "Members can earn points by submitting their resume to the chapter resume book.",
    
    # --- Corporate & Career ---
    "The SHPE National Convention is the largest gathering of Hispanic STEM students in the country.",
    "Recruiters from companies like Microsoft, Google, and Lockheed Martin frequently attend SHPE UF info sessions.",
    "The Career Showcase prep night helps members practice their elevator pitches.",
    "Sponsors often host technical workshops teaching skills like Python, CAD, or Excel.",
    "Gold level sponsors get a dedicated GBM slot to present to the chapter.",
    "Interview offers are often extended on the spot during the National Convention career fair.",
    
    # --- Leadership & Internal ---
    "The Executive Board (E-Board) consists of the President, VP Internal, VP External, Treasurer, and Secretary.",
    "Elections for the new Executive Board take place in late March or early April.",
    "Directors are appointed by the E-Board to lead specific initiatives like Marketing or Tech.",
    "The Tech Director is responsible for maintaining the SHPE UF website and iOS app.",
    "The SHPE Office is a space for members to hang out and study, located in the Weil Hall basement (or Turlington depending on the year).",
    "All official communication happens through the SHPE UF Slack workspace.",
    "The 'Familia' system groups members into smaller families for closer bonding and mentoring.",
    "Each SHPE family competes for the 'Family Cup' by accumulating the most aggregate points.",
    "Regional Leadership Development Conferences (RLDC) are held in the spring for leadership training."
]

    print(f"📄 Found {len(documents)} documents to index.")

    # 2. Add to ChromaDB
    # The RAGEngine wrapper handles the embedding generation automatically
    try:
        rag_engine.add_documents(documents)
        print("✅ Ingestion Complete! Documents added to ChromaDB.")
    except Exception as e:
        print(f"❌ Error during ingestion: {e}")

if __name__ == "__main__":
    run_ingestion()
