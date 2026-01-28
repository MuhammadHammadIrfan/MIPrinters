import Link from 'next/link';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-100">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-600 text-white font-bold text-sm">
                            MI
                        </div>
                        <span className="font-bold text-gray-900">MI Printers</span>
                    </Link>
                    <nav className="flex items-center gap-4">
                        <Link href="/about" className="text-sm text-green-600 font-medium">
                            About
                        </Link>
                        <Link href="/contact" className="text-sm text-gray-600 hover:text-gray-900">
                            Contact
                        </Link>
                        <Link href="/login" className="btn-primary text-sm px-4 py-2">
                            Owner Login
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Content */}
            <main className="pt-24 pb-20 px-4">
                <div className="max-w-3xl mx-auto">
                    <h1 className="text-4xl font-bold text-gray-900 mb-6">About MI Printers</h1>

                    <div className="prose prose-lg text-gray-600">
                        <p className="text-xl mb-6">
                            MI Printers is a leading printing service provider based in Faisalabad, Pakistan.
                            We specialize in delivering high-quality printing solutions for businesses of all sizes.
                        </p>

                        <div className="card mb-8">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Our Mission</h2>
                            <p>
                                To provide our customers with exceptional printing services that exceed their expectations,
                                delivered on time and at competitive prices.
                            </p>
                        </div>

                        <div className="card mb-8">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Why Choose Us?</h2>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-3">
                                    <span className="text-green-600">✓</span>
                                    <span><strong>Quality First:</strong> We use premium materials and state-of-the-art equipment.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="text-green-600">✓</span>
                                    <span><strong>Fast Turnaround:</strong> Quick delivery without compromising on quality.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="text-green-600">✓</span>
                                    <span><strong>Competitive Pricing:</strong> Best value for your money.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="text-green-600">✓</span>
                                    <span><strong>Expert Team:</strong> Experienced professionals who understand your needs.</span>
                                </li>
                            </ul>
                        </div>

                        <div className="card bg-green-50 border-green-200">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Get in Touch</h2>
                            <p className="mb-4">
                                Ready to start your next printing project? Contact us today for a free consultation.
                            </p>
                            <Link href="/contact" className="btn-primary inline-block">
                                Contact Us
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-400 py-8">
                <div className="max-w-6xl mx-auto px-4 text-center text-sm">
                    © 2024 MI Printers. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
