//
//  CarPlayDelegate.swift
//  Vazhi
//
//  Apple CarPlay Navigation Delegate Bridge.
//  Reads shared NavigationSession state and renders native CarPlay navigation templates.
//

#if canImport(CarPlay)
import CarPlay
import UIKit

@available(iOS 12.0, *)
class CarPlayDelegate: NSObject, CPTemplateApplicationSceneDelegate, CPNavigationSessionDelegate {

    var interfaceController: CPInterfaceController?
    var navigationSession: CPNavigationSession?

    func templateApplicationScene(_ templateApplicationScene: CPTemplateApplicationScene, didConnect interfaceController: CPInterfaceController) {
        self.interfaceController = interfaceController
        
        let mainMapTemplate = CPMapTemplate()
        let trip = CPTrip(origin: MKMapItem(placemark: MKPlacemark(coordinate: CLLocationCoordinate2D(latitude: 11.0168, longitude: 76.9558))),
                          destination: MKMapItem(placemark: MKPlacemark(coordinate: CLLocationCoordinate2D(latitude: 11.4102, longitude: 76.6950))),
                          routeChoices: [])
        
        mainMapTemplate.showTripPreviews([trip], textConfiguration: nil)
        interfaceController.setRootTemplate(mainMapTemplate, animated: true, completion: nil)
    }

    func templateApplicationScene(_ templateApplicationScene: CPTemplateApplicationScene, didDisconnectInterfaceController interfaceController: CPInterfaceController) {
        self.interfaceController = nil
    }
}
#endif
