import React from "react";

export default function Shipping() {
  return (
    <div className="container mx-auto px-6 md:px-12 lg:px-24 max-w-[1000px] py-16">
      <h1 className="font-serif text-4xl text-charcoal mb-6">Shipping & Delivery</h1>
      <div className="space-y-4 text-graphite leading-relaxed">
        <p>We currently deliver within Kenya.</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Nairobi: 1–2 business days</li>
          <li>Major towns: 2–4 business days</li>
          <li>Other areas: 3–5 business days</li>
        </ul>
        <p>Delivery updates are shared via phone/SMS where needed.</p>
      </div>
    </div>
  );
}