import type { ReactNode } from "react";

export const LandingPage = (): ReactNode => {
  return (
    <div className="landing-section">
      <div className="card-container">
        
        {/* Card 1 */}
        <div className="features-card">
          <div className="card-icon">📑</div>
          <h3 className="card-title">Understand Your Records</h3>
          <p className="card-text">
            No more medical jargon. MedBridge translates complex healthcare documents, 
            lab results, and physician notes into clear, everyday language so you always 
            know exactly what your health data means.
          </p>
        </div>
        
        {/* Card 2 */}
        <div className="features-card">
          <div className="card-icon">📚</div>
          <h3 className="card-title">Your History, Simplified</h3>
          <p className="card-text">
            Keep your health journey organized in one place. Securely upload documents, 
            track your medical history, and access your personalized health timeline 
            through a single, intuitive dashboard.
          </p>
        </div>
        
        {/* Card 3 */}
        <div className="features-card">
          <div className="card-icon">💡</div>
          <h3 className="card-title">Take Control of Your Health</h3>
          <p className="card-text">
            Feel confident at your next doctor's appointment. With clear insights and 
            organized records at your fingertips, you have the information you need to 
            make smart, informed decisions about your well-being.
          </p>
        </div>

      </div>
    </div>
  );
};