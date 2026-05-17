import React from 'react';
import { X, CreditCard, Smartphone, CheckCircle, Loader2 } from 'lucide-react';

const PaymentModal = ({ isOpen, onClose, onConfirm, amount }) => {
  const [method, setMethod] = React.useState('bkash');
  const [isProcessing, setIsProcessing] = React.useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsProcessing(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsProcessing(false);
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-gray-50 flex justify-between items-center">
          <h2 className="text-2xl font-black text-gray-900">Secure Payment</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="p-8">
          <div className="text-center mb-10">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-widest block mb-2">Payable Amount</span>
            <span className="text-4xl font-black text-primary">৳{amount}</span>
          </div>

          <div className="space-y-4 mb-10">
            {[
              { id: 'bkash', name: 'bKash', icon: <Smartphone className="w-6 h-6 text-pink-500" /> },
              { id: 'nagad', name: 'Nagad', icon: <Smartphone className="w-6 h-6 text-orange-500" /> },
              { id: 'card', name: 'Credit/Debit Card', icon: <CreditCard className="w-6 h-6 text-blue-500" /> }
            ].map(item => (
              <div 
                key={item.id}
                onClick={() => setMethod(item.id)}
                className={`p-5 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition ${
                  method === item.id ? 'border-primary bg-primary/5' : 'border-gray-50 hover:border-gray-100'
                }`}
              >
                <div className="flex items-center gap-4">
                  {item.icon}
                  <span className="font-bold text-gray-800">{item.name}</span>
                </div>
                {method === item.id && <CheckCircle className="w-5 h-5 text-primary" />}
              </div>
            ))}
          </div>

          <button 
            disabled={isProcessing}
            onClick={handleConfirm}
            className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black text-lg hover:bg-primary transition shadow-xl shadow-gray-200 flex items-center justify-center"
          >
            {isProcessing ? (
              <Loader2 className="animate-spin" />
            ) : (
              `Pay ৳${amount} Now`
            )}
          </button>
          
          <p className="text-center text-[10px] text-gray-400 mt-6 uppercase tracking-widest font-bold">
            🔒 This is a simulated payment demonstration
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
