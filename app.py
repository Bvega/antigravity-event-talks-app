import re
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache for parsed release notes
_cached_data = None


def fetch_and_parse_feed():
    """Fetches the XML feed from Google Cloud and parses it into structured data."""
    global _cached_data
    try:
        req = urllib.request.Request(
            FEED_URL,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()

        root = ET.fromstring(xml_data)
        ns = {"atom": "http://www.w3.org/2005/Atom"}

        entries = []
        for entry in root.findall("atom:entry", ns):
            title = entry.find("atom:title", ns).text
            updated = entry.find("atom:updated", ns).text

            link_elem = entry.find('atom:link[@rel="alternate"]', ns)
            link = (
                link_elem.attrib.get("href", "")
                if link_elem is not None
                else ""
            )

            content_elem = entry.find("atom:content", ns)
            content_html = content_elem.text if content_elem is not None else ""

            # Parse individual updates within content
            # The feed has entries with titles like 'June 15, 2026'
            # inside <content type="html">, it has <h3>Feature</h3>, <p>...</p>, etc.
            parts = re.split(r"<h3>(.*?)</h3>", content_html)
            updates = []
            for i in range(1, len(parts), 2):
                if i + 1 < len(parts):
                    change_type = parts[i].strip()
                    change_html = parts[i + 1].strip()

                    # Create a clean text preview for Twitter and searching
                    text_preview = re.sub("<[^<]+?>", "", change_html).strip()
                    # Clean up multiple whitespaces and newlines
                    text_preview = re.sub(r"\s+", " ", text_preview)

                    updates.append(
                        {
                            "type": change_type,
                            "html": change_html,
                            "text": text_preview,
                        }
                    )

            entries.append(
                {
                    "date": title,
                    "updated": updated,
                    "link": link,
                    "updates": updates,
                }
            )

        _cached_data = entries
        return entries, None
    except Exception as e:
        print(f"Error fetching or parsing feed: {e}")
        return None, str(e)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/releases")
def get_releases():
    global _cached_data
    force_refresh = request.args.get("refresh", "false").lower() == "true"

    if _cached_data is None or force_refresh:
        data, error = fetch_and_parse_feed()
        if error:
            # If there's an error but we have cached data, return the cached data with a warning
            if _cached_data is not None:
                return jsonify(
                    {
                        "status": "warning",
                        "message": f"Failed to refresh feed. Using cached data. Error: {error}",
                        "releases": _cached_data,
                    }
                )
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": f"Failed to fetch release notes: {error}",
                        "releases": [],
                    }
                ),
                500,
            )
        return jsonify(
            {
                "status": "success",
                "message": "Feed fetched successfully.",
                "releases": data,
            }
        )

    return jsonify(
        {
            "status": "success",
            "message": "Using cached feed data.",
            "releases": _cached_data,
        }
    )


if __name__ == "__main__":
    app.run(debug=True, port=8080)
