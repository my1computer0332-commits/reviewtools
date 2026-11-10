const ITEMS = [
  {
    question: "Is this free?",
    answer:
      "Yes. The generator runs in your browser and does not require an account. Name search uses your own Google Places API key, which Google bills directly.",
  },
  {
    question: "Do I need a Google Business Profile?",
    answer:
      "No. A public Google Maps listing is enough. Managing the profile is a separate task, and you do not need management access to create a review link.",
  },
  {
    question: "Why does a Google Maps link sometimes open the listing instead of the review form?",
    answer:
      "Google's review form opens with a Place ID (starts with “ChIJ”). If your Maps URL contains a 0x…:0x… feature pair, the tool rebuilds the Place ID automatically and returns a one-tap link. A CID-only link uses a Google Search fallback that opens the reviews panel. If a link still lands on the listing, paste the full Maps URL from Share → Copy link, or paste the Place ID directly.",
  },
  {
    question: "Are the Facebook, Yelp, and Tripadvisor links direct review forms?",
    answer:
      "They open the reviews area for that business. Facebook pages have a dedicated Reviews tab. Yelp and Tripadvisor require their own internal IDs to open a blank review form, so the generated link lands on the reviews section where the reviewer can start.",
  },
  {
    question: "Where is my Places API key stored?",
    answer:
      "Only in this browser's local storage, and only if you leave “Remember this key” checked. It is sent to places.googleapis.com for search requests and nowhere else. Clear it at any time by unchecking the box.",
  },
  {
    question: "Can customers choose their own star rating?",
    answer:
      "Yes. A review link cannot preselect a rating. Customers choose their own stars and write their own words, which is exactly what platform policies require.",
  },
  {
    question: "Does the QR code expire?",
    answer:
      "No. The QR code encodes the review URL directly, so it keeps working as long as the link does. Download the SVG for print work and the PNG for screens and documents.",
  },
];

export function Faq() {
  return (
    <section className="card faq">
      <div className="section-head">
        <p className="eyebrow">FAQ</p>
        <h2>Questions people ask before sharing a review link</h2>
      </div>
      <div className="faq-list">
        {ITEMS.map((item) => (
          <details key={item.question} className="faq-item">
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
