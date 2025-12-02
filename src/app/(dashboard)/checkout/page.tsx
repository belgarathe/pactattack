'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import { Package, MapPin, CreditCard, ArrowLeft, Check } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import Link from 'next/link';

type CartItem = {
  id: string;
  pullId: string;
  card: {
    id: string;
    name: string;
    rarity: string;
    imageUrlGatherer: string;
    imageUrlScryfall: string | null;
    setName: string;
    priceAvg: number | null;
  };
  quantity: number;
};

type UserAddress = {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
};

const SHIPPING_COST = 5.0; // 5 EUR

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useUser();
  const { addToast } = useToast();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [useSavedAddress, setUseSavedAddress] = useState(false);
  const [savedAddress, setSavedAddress] = useState<UserAddress | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    phone: '',
  });

  const loadCart = useCallback(async () => {
    try {
      const res = await fetch('/api/cart');
      const data = await res.json();

      if (res.ok && data.success) {
        setCartItems(data.data.items || []);
        setSubtotal(data.data.total || 0);
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
      addToast({
        title: 'Error',
        description: 'Failed to load cart',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const loadUserAddress = useCallback(async () => {
    try {
      const res = await fetch('/api/user/address');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.address) {
          setSavedAddress(data.address);
          const hasAddress = data.address.addressLine1 && data.address.city && data.address.postalCode;
          if (hasAddress) {
            setUseSavedAddress(true);
            setFormData({
              name: user?.name || '',
              addressLine1: data.address.addressLine1 || '',
              addressLine2: data.address.addressLine2 || '',
              city: data.address.city || '',
              state: data.address.state || '',
              postalCode: data.address.postalCode || '',
              country: data.address.country || '',
              phone: data.address.phone || '',
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to load address:', error);
    }
  }, [user?.name]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadCart();
    loadUserAddress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const handleUseSavedAddress = () => {
    if (savedAddress && savedAddress.addressLine1) {
      setUseSavedAddress(true);
      setFormData({
        name: user?.name || '',
        addressLine1: savedAddress.addressLine1 || '',
        addressLine2: savedAddress.addressLine2 || '',
        city: savedAddress.city || '',
        state: savedAddress.state || '',
        postalCode: savedAddress.postalCode || '',
        country: savedAddress.country || '',
        phone: savedAddress.phone || '',
      });
    }
  };

  const handleSaveAddress = async () => {
    try {
      const res = await fetch('/api/user/address', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        addToast({
          title: 'Address saved',
          description: 'Your address has been saved for future orders',
        });
        await loadUserAddress();
      }
    } catch (error) {
      console.error('Failed to save address:', error);
    }
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      addToast({
        title: 'Cart is empty',
        description: 'Please add items to your cart before checkout',
        variant: 'destructive',
      });
      return;
    }

    // Validate required fields
    if (!formData.addressLine1 || !formData.city || !formData.postalCode || !formData.country) {
      addToast({
        title: 'Missing information',
        description: 'Please fill in all required address fields',
        variant: 'destructive',
      });
      return;
    }

    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/checkout/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippingAddress: {
            name: formData.name || user?.name || 'Customer',
            address: {
              line1: formData.addressLine1,
              line2: formData.addressLine2 || undefined,
              city: formData.city,
              state: formData.state || undefined,
              postal_code: formData.postalCode,
              country: formData.country,
            },
            phone: formData.phone || undefined,
          },
          saveAddress: useSavedAddress, // Save address if checkbox is checked
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout');
      }

      // Save address if requested
      if (useSavedAddress) {
        await handleSaveAddress();
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      addToast({
        title: 'Checkout failed',
        description: (error as Error).message || 'Failed to start checkout',
        variant: 'destructive',
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const total = subtotal + SHIPPING_COST;
  const rarityColors: Record<string, string> = {
    common: 'bg-gray-500',
    uncommon: 'bg-green-500',
    rare: 'bg-blue-500',
    mythic: 'bg-yellow-500',
  };

  if (loading) {
    return (
      <div className="container py-12">
        <div className="text-center">Loading checkout...</div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="container py-12">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="mb-4 h-16 w-16 text-muted" />
            <h2 className="mb-2 text-2xl font-bold">Your cart is empty</h2>
            <p className="mb-6 text-muted">Add cards from your collection to order physical copies</p>
            <Button asChild>
              <Link href="/collection">Browse Collection</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/cart">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Cart
          </Link>
        </Button>
        <h1 className="mb-2 text-4xl font-bold">Checkout</h1>
        <p className="text-muted">Review your order and enter delivery information</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Order Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Summary ({cartItems.length} item{cartItems.length !== 1 ? 's' : ''})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-4 rounded-lg border border-white/10 bg-white/5 p-4">
                    <div className="relative h-24 w-16 flex-shrink-0 rounded overflow-hidden border border-white/10">
                      {item.card.imageUrlGatherer || item.card.imageUrlScryfall ? (
                        <Image
                          src={item.card.imageUrlGatherer || item.card.imageUrlScryfall || ''}
                          alt={item.card.name}
                          fill
                          className="object-contain"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted text-xs">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{item.card.name}</h3>
                          <p className="text-sm text-muted">{item.card.setName}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <Badge className={rarityColors[item.card.rarity.toLowerCase()] || 'bg-gray-500'}>
                              {item.card.rarity}
                            </Badge>
                            {item.card.priceAvg && (
                              <span className="text-sm text-muted">
                                {formatCurrency(item.card.priceAvg)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Delivery Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Delivery Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {savedAddress?.addressLine1 && (
                <div className="rounded-lg border border-primary/50 bg-primary/10 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="font-semibold">Saved Address Available</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleUseSavedAddress}
                      disabled={useSavedAddress}
                    >
                      {useSavedAddress ? 'Using Saved Address' : 'Use Saved Address'}
                    </Button>
                  </div>
                  <p className="text-sm text-muted">
                    {savedAddress.addressLine1}, {savedAddress.city}, {savedAddress.postalCode}, {savedAddress.country}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addressLine1">Address Line 1 *</Label>
                  <Input
                    id="addressLine1"
                    value={formData.addressLine1}
                    onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                    placeholder="123 Main Street"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addressLine2">Address Line 2</Label>
                  <Input
                    id="addressLine2"
                    value={formData.addressLine2}
                    onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                    placeholder="Apartment, suite, etc. (optional)"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="New York"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">State/Province</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="NY"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal Code *</Label>
                    <Input
                      id="postalCode"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      placeholder="10001"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country *</Label>
                    <select
                      id="country"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="flex h-10 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm"
                      required
                    >
                      <option value="">Select Country</option>
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="GB">United Kingdom</option>
                      <option value="DE">Germany</option>
                      <option value="FR">France</option>
                      <option value="IT">Italy</option>
                      <option value="ES">Spain</option>
                      <option value="NL">Netherlands</option>
                      <option value="BE">Belgium</option>
                      <option value="AT">Austria</option>
                      <option value="CH">Switzerland</option>
                      <option value="SE">Sweden</option>
                      <option value="NO">Norway</option>
                      <option value="DK">Denmark</option>
                      <option value="FI">Finland</option>
                      <option value="PL">Poland</option>
                      <option value="CZ">Czech Republic</option>
                      <option value="IE">Ireland</option>
                      <option value="PT">Portugal</option>
                      <option value="GR">Greece</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="saveAddress"
                    checked={useSavedAddress}
                    onChange={(e) => setUseSavedAddress(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20"
                  />
                  <Label htmlFor="saveAddress" className="cursor-pointer">
                    Save this address for future orders
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Subtotal ({cartItems.length} item{cartItems.length !== 1 ? 's' : ''})</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Shipping</span>
                  <span>{formatCurrency(SHIPPING_COST)}</span>
                </div>
                <div className="border-t border-white/10 pt-2">
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-lg">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                disabled={checkoutLoading || cartItems.length === 0}
              >
                {checkoutLoading ? (
                  'Processing...'
                ) : (
                  <>
                    Proceed to Payment
                    <CreditCard className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-xs text-muted text-center">
                You will be redirected to Stripe to complete payment securely
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


