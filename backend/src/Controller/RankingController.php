<?php

declare(strict_types=1);

namespace App\Controller;

use App\Offer\OfferReader;
use App\Ranking\Ranking;
use App\Ranking\RankingErrorCode;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class RankingController extends AbstractController
{
    public function __construct(
        private readonly OfferReader $offers,
        private readonly LoggerInterface $logger,
    ) {
    }

    #[Route('/api/ranking', name: 'api_ranking', methods: ['GET'])]
    public function __invoke(Request $request): JsonResponse
    {
        try {
            $offers = $this->offers->all();
        } catch (\Throwable $exception) {
            $this->logger->error('Offer catalog could not be read.', ['exception' => $exception]);

            return $this->respond(Ranking::error(RankingErrorCode::OffersUnavailable), 503);
        }

        $result = Ranking::build($request->query->all(), $offers);

        return $this->respond($result, Ranking::httpStatus($result));
    }

    /**
     * @param array<string, mixed> $body
     */
    private function respond(array $body, int $status): JsonResponse
    {
        $response = new JsonResponse($body, $status);
        $response->setEncodingOptions(\JSON_UNESCAPED_UNICODE | \JSON_UNESCAPED_SLASHES);

        return $response;
    }
}
