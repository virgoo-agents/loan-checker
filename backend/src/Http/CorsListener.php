<?php

declare(strict_types=1);

namespace App\Http;

use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * The Vue SPA is served from another origin. Exact origins only.
 */
final class CorsListener
{
    private const ORIGINS = [
        'https://loan-checker-virgoo.vercel.app',
        'http://localhost:5173',
    ];

    #[AsEventListener(event: KernelEvents::REQUEST, priority: 255)]
    public function onRequest(RequestEvent $event): void
    {
        if (!$event->isMainRequest() || !$event->getRequest()->isMethod('OPTIONS')) {
            return;
        }
        $origin = $event->getRequest()->headers->get('Origin');
        if (!$this->allowed($origin)) {
            return;
        }
        $response = new Response('', 204);
        $this->apply($response, $origin);
        $event->setResponse($response);
    }

    #[AsEventListener(event: KernelEvents::RESPONSE)]
    public function onResponse(ResponseEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }
        $origin = $event->getRequest()->headers->get('Origin');
        if (!$this->allowed($origin)) {
            return;
        }
        $this->apply($event->getResponse(), $origin);
    }

    private function allowed(?string $origin): bool
    {
        return $origin !== null && \in_array($origin, self::ORIGINS, true);
    }

    private function apply(Response $response, string $origin): void
    {
        if ($response->headers->get('Access-Control-Allow-Origin') === $origin) {
            return;
        }
        $response->headers->set('Access-Control-Allow-Origin', $origin);
        $response->headers->set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        $response->headers->set('Access-Control-Allow-Headers', 'Accept, Content-Type');
        $response->headers->set('Vary', 'Origin', false);
    }
}
