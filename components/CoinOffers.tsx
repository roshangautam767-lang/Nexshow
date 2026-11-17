const items = [
  { t: 'Earn 10 Movie Coins', d: 'Your first confirmed booking rewards you with 10 coins.' },
  { t: 'Win 1 to 8 coins every time', d: 'Every booking after that earns a random reward.' },
  { t: '1 Movie Coin = ₹1 off', d: 'Use your coins as a discount on your next tickets.' },
  { t: 'Coupons', d: 'Coupon codes will appear here once they are added by the NexShow team.' },
];

export default function CoinOffers() {
  return (
    <section id="offers" className="container-x py-10">
      <h2 className="mb-1 font-display text-3xl font-black">Movie Coins and offers</h2>
      <p className="mb-5 max-w-xl text-mu">Coins are added only after your payment is verified and your booking is confirmed.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((x) => (
          <div key={x.t} className="rounded-md border border-line border-t-red bg-panel p-5 [border-top-width:3px]">
            <h3 className="font-display text-2xl font-bold">{x.t}</h3>
            <p className="mt-1 text-sm text-mu">{x.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
